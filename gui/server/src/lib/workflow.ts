import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Octokit } from '@octokit/rest';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { cellStatusHistory, cells, mergeQueue } from '../db/schema.js';

export const WORKFLOW_STATES = [
  'backlog',
  'ready',
  'in-progress',
  'blocked',
  'review',
  'promotion',
  'shipping',
  'done',
] as const;

export type WorkflowState = (typeof WORKFLOW_STATES)[number];
export type MutableWorkflowState = Exclude<WorkflowState, 'promotion' | 'shipping'>;

const ISSUE_STATE_LABELS = [
  'cell:queued',
  'cell:active',
  'cell:blocked',
  'cell:awaiting-review',
  'cell:merged',
] as const;

const CACHE_TTL_MS = 5 * 60 * 1000;

type ProjectsConfig = {
  projects: Record<
    string,
    {
      repo: string;
      defaultBranch?: string;
      featureTarget?: string;
      promotionPath?: string[];
      packages?: Record<string, { repo: string; featureTarget?: string }>;
    }
  >;
};

type RepoWorkflowConfig = {
  project: string;
  repo: string;
  defaultBranch: string;
  featureTarget: string;
  promotionPath: string[];
  mainBranch: string;
  shippingBranch: string | null;
  shippingMode: 'branch' | 'approval';
};

type CachedIssues = {
  data: GitHubIssueSummary[];
  fetchedAt: number;
};

type CachedPullRequest = {
  data: WorkflowPullRequestSummary;
  fetchedAt: number;
};

type CellRow = {
  id: number;
  feature: string;
  project: string;
  branch: string;
  status: string;
  scope: object | null;
  blocker: string | null;
  handoff: string | null;
  githubIssueUrl: string | null;
  githubPrUrl: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type CellStatus = 'queued' | 'active' | 'blocked' | 'awaiting-review' | 'merged';

type CellHistoryRow = {
  id: number;
  cellId: number | null;
  fromStatus: string | null;
  toStatus: string;
  changedAt: Date | null;
  note: string | null;
};

export interface GitHubIssueSummary {
  id: number;
  number: number;
  title: string;
  body: string;
  labels: string[];
  repo: string;
  project: string;
  htmlUrl: string;
  issueRef: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  githubState: 'open' | 'closed';
  user: string;
  assignee: string | null;
  comments: number;
}

export interface WorkflowExecutionSummary {
  id: number;
  feature: string;
  project: string;
  branch: string;
  status: CellStatus;
  scope: object | null;
  blocker: string | null;
  handoff: string | null;
  githubIssueUrl: string | null;
  githubPrUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WorkflowPullRequestSummary {
  number: number;
  url: string;
  baseRefName: string;
  mergedAt: string | null;
  state: 'open' | 'closed';
}

export interface WorkflowIssueSummary extends GitHubIssueSummary {
  workflowState: WorkflowState;
  workflowSource: 'promotion' | 'approval' | 'execution' | 'label' | 'default';
  linkedExecution: WorkflowExecutionSummary | null;
  linkedPullRequest: WorkflowPullRequestSummary | null;
  inShippingQueue: boolean;
  shippingMode: 'branch' | 'approval';
  shippingBranch: string | null;
  mainBranch: string;
}

export interface WorkflowIssueDetail extends WorkflowIssueSummary {
  commentsList: {
    id: number;
    author: string;
    body: string;
    createdAt: string;
  }[];
  history: {
    id: number;
    fromStatus: string | null;
    toStatus: string;
    changedAt: string | null;
    note: string | null;
  }[];
}

const cache = new Map<string, CachedIssues>();
const pullRequestCache = new Map<string, CachedPullRequest>();

export function buildIssueRef(repo: string, number: number) {
  return `${repo}#${number}`;
}

export function parseIssueRef(issueRef: string) {
  const index = issueRef.lastIndexOf('#');
  if (index === -1) {
    throw new Error(`Invalid issue ref: ${issueRef}`);
  }

  const repo = issueRef.slice(0, index);
  const number = Number(issueRef.slice(index + 1));

  if (!repo || Number.isNaN(number)) {
    throw new Error(`Invalid issue ref: ${issueRef}`);
  }

  return { repo, number };
}

export function workflowStateLabel(state: MutableWorkflowState) {
  const labelMap: Record<MutableWorkflowState, string | null> = {
    backlog: null,
    ready: 'cell:queued',
    'in-progress': 'cell:active',
    blocked: 'cell:blocked',
    review: 'cell:awaiting-review',
    done: 'cell:merged',
  };

  return labelMap[state];
}

function getOctokit() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is not set');
  }

  return new Octokit({ auth: token });
}

function getMainBranch(promotionPath: string[], defaultBranch: string) {
  return promotionPath[promotionPath.length - 1] || defaultBranch || 'main';
}

function getShippingBranch(promotionPath: string[], mainBranch: string) {
  const mainIndex = promotionPath.lastIndexOf(mainBranch);
  if (mainIndex <= 0) return null;
  return promotionPath[mainIndex - 1] || null;
}

function fallbackRepoWorkflowConfig(repo: string, project = ''): RepoWorkflowConfig {
  return {
    project,
    repo,
    defaultBranch: 'main',
    featureTarget: 'main',
    promotionPath: ['main'],
    mainBranch: 'main',
    shippingBranch: null,
    shippingMode: 'approval',
  };
}

function loadRepoWorkflowConfigMap() {
  const configPath = resolve(import.meta.dirname, '..', '..', '..', '..', 'projects.json');
  const raw = JSON.parse(readFileSync(configPath, 'utf-8')) as ProjectsConfig;
  const repoMap = new Map<string, RepoWorkflowConfig>();

  for (const [projectName, config] of Object.entries(raw.projects)) {
    const defaultBranch = config.defaultBranch || 'main';
    const featureTarget = config.featureTarget || defaultBranch;
    const promotionPath = config.promotionPath?.length ? [...config.promotionPath] : [defaultBranch];
    const mainBranch = getMainBranch(promotionPath, defaultBranch);
    const shippingBranch = getShippingBranch(promotionPath, mainBranch);
    const baseConfig: RepoWorkflowConfig = {
      project: projectName,
      repo: config.repo,
      defaultBranch,
      featureTarget,
      promotionPath,
      mainBranch,
      shippingBranch,
      shippingMode: shippingBranch ? 'branch' : 'approval',
    };

    repoMap.set(config.repo, baseConfig);

    if (config.packages) {
      for (const pkg of Object.values(config.packages)) {
        repoMap.set(pkg.repo, {
          ...baseConfig,
          repo: pkg.repo,
          featureTarget: pkg.featureTarget || featureTarget,
        });
      }
    }
  }

  return repoMap;
}

function compareDateDesc(a?: string | null, b?: string | null) {
  return new Date(b || 0).getTime() - new Date(a || 0).getTime();
}

function normalizeCell(cell: CellRow | undefined): WorkflowExecutionSummary | null {
  if (!cell) return null;

  return {
    id: cell.id,
    feature: cell.feature,
    project: cell.project,
    branch: cell.branch,
    status: cell.status as CellStatus,
    scope: cell.scope,
    blocker: cell.blocker,
    handoff: cell.handoff,
    githubIssueUrl: cell.githubIssueUrl,
    githubPrUrl: cell.githubPrUrl,
    createdAt: cell.createdAt?.toISOString() || null,
    updatedAt: cell.updatedAt?.toISOString() || null,
  };
}

function parsePullRequestUrl(url: string) {
  const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)$/);
  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2],
    number: Number(match[3]),
  };
}

async function fetchPullRequestForUrl(octokit: Octokit, url: string, refresh?: boolean) {
  const cached = pullRequestCache.get(url);
  if (!refresh && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const parsed = parsePullRequestUrl(url);
  if (!parsed) return null;

  const response = await octokit.pulls.get({
    owner: parsed.owner,
    repo: parsed.repo,
    pull_number: parsed.number,
  });

  const data: WorkflowPullRequestSummary = {
    number: response.data.number,
    url: response.data.html_url,
    baseRefName: response.data.base.ref,
    mergedAt: response.data.merged_at,
    state: response.data.state as 'open' | 'closed',
  };

  pullRequestCache.set(url, { data, fetchedAt: Date.now() });
  return data;
}

function shouldRefreshPullRequest(args: {
  issueState?: 'open' | 'closed';
  issueClosedAt?: string | null;
  executionStatus?: string | null;
  labels?: string[];
}) {
  if (args.issueState === 'closed' || args.issueClosedAt) {
    return true;
  }

  if (args.executionStatus === 'awaiting-review') {
    return true;
  }

  if (args.labels?.includes('cell:awaiting-review')) {
    return true;
  }

  return false;
}

function deriveWorkflowState(input: {
  labels: string[];
  githubState?: 'open' | 'closed';
  executionStatus?: string | null;
  pullRequest: WorkflowPullRequestSummary | null;
  inShippingQueue: boolean;
  projectConfig: RepoWorkflowConfig;
}): { state: WorkflowState; source: WorkflowIssueSummary['workflowSource'] } {
  const { projectConfig, pullRequest } = input;

  if (pullRequest?.mergedAt) {
    if (pullRequest.baseRefName === projectConfig.mainBranch) {
      return { state: 'done', source: 'promotion' };
    }

    if (projectConfig.shippingBranch && pullRequest.baseRefName === projectConfig.shippingBranch) {
      return { state: 'shipping', source: 'promotion' };
    }

    if (projectConfig.promotionPath.includes(pullRequest.baseRefName)) {
      return { state: 'promotion', source: 'promotion' };
    }
  }

  if (projectConfig.shippingMode === 'approval' && input.inShippingQueue) {
    return { state: 'shipping', source: 'approval' };
  }

  const executionMap: Record<string, WorkflowState> = {
    queued: 'ready',
    active: 'in-progress',
    blocked: 'blocked',
    'awaiting-review': 'review',
    merged: projectConfig.shippingMode === 'approval' ? 'done' : 'promotion',
  };

  const labelMap: Record<string, WorkflowState> = {
    'cell:queued': 'ready',
    'cell:active': 'in-progress',
    'cell:blocked': 'blocked',
    'cell:awaiting-review': 'review',
    'cell:merged': projectConfig.shippingMode === 'approval' ? 'done' : 'promotion',
  };

  if (input.githubState !== 'closed') {
    for (const label of input.labels) {
      if (labelMap[label]) {
        return { state: labelMap[label], source: 'label' };
      }
    }
  }

  if (input.executionStatus && executionMap[input.executionStatus]) {
    return { state: executionMap[input.executionStatus], source: 'execution' };
  }

  for (const label of input.labels) {
    if (labelMap[label]) {
      return { state: labelMap[label], source: 'label' };
    }
  }

  return { state: 'backlog', source: 'default' };
}

async function fetchIssuesForRepo(
  octokit: Octokit,
  repo: string,
  project: string,
  refresh?: boolean
) {
  const cached = cache.get(repo);
  if (!refresh && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const [owner, name] = repo.split('/');
  const response = await octokit.issues.listForRepo({
    owner,
    repo: name,
    state: 'all',
    per_page: 100,
  });

  const issues: GitHubIssueSummary[] = response.data
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      labels: issue.labels
        .map((label) => (typeof label === 'string' ? label : label.name || ''))
        .filter(Boolean),
      repo,
      project,
      htmlUrl: issue.html_url,
      issueRef: buildIssueRef(repo, issue.number),
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at,
      githubState: issue.state as 'open' | 'closed',
      user: issue.user?.login || '',
      assignee: issue.assignee?.login || null,
      comments: issue.comments,
    }));

  cache.set(repo, { data: issues, fetchedAt: Date.now() });
  return issues;
}

async function fetchExecutionContext() {
  try {
    const executionRows = (await db.select().from(cells)) as CellRow[];
    const shippingRows = await db.select({ cellId: mergeQueue.cellId }).from(mergeQueue);

    const latestExecutionByIssueUrl = new Map<string, CellRow>();
    for (const execution of executionRows) {
      if (!execution.githubIssueUrl) continue;
      const existing = latestExecutionByIssueUrl.get(execution.githubIssueUrl);
      if (
        !existing ||
        (execution.updatedAt?.getTime() || 0) > (existing.updatedAt?.getTime() || 0)
      ) {
        latestExecutionByIssueUrl.set(execution.githubIssueUrl, execution);
      }
    }

    return {
      latestExecutionByIssueUrl,
      shippingCellIds: new Set(shippingRows.map((row) => row.cellId).filter(Boolean) as number[]),
    };
  } catch {
    return {
      latestExecutionByIssueUrl: new Map<string, CellRow>(),
      shippingCellIds: new Set<number>(),
    };
  }
}

export async function listWorkflowIssues(options?: {
  project?: string;
  refresh?: boolean;
  includeClosedBacklog?: boolean;
}) {
  const repoMap = loadRepoWorkflowConfigMap();
  const octokit = getOctokit();
  const repos = [...repoMap.entries()]
    .filter(([, config]) => !options?.project || config.project === options.project)
    .map(([repo, config]) => ({ repo, config }));

  const [issueResults, executionContext] = await Promise.all([
    Promise.allSettled(
      repos.map(({ repo, config }) =>
        fetchIssuesForRepo(octokit, repo, config.project, options?.refresh)
      )
    ),
    fetchExecutionContext(),
  ]);

  const issues = issueResults.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : []
  );

  const pullRequestUrls = [
    ...new Set(
      issues
        .map((issue) => executionContext.latestExecutionByIssueUrl.get(issue.htmlUrl)?.githubPrUrl)
        .filter(Boolean)
    ),
  ] as string[];
  const forceRefreshPullRequestUrls = new Set(
    issues
      .map((issue) => {
        const execution = executionContext.latestExecutionByIssueUrl.get(issue.htmlUrl);
        if (!execution?.githubPrUrl) return null;

        return shouldRefreshPullRequest({
          issueState: issue.githubState,
          issueClosedAt: issue.closedAt,
          executionStatus: execution.status,
          labels: issue.labels,
        })
          ? execution.githubPrUrl
          : null;
      })
      .filter(Boolean) as string[]
  );

  const pullRequestResults = await Promise.allSettled(
    pullRequestUrls.map((url) =>
      fetchPullRequestForUrl(octokit, url, options?.refresh || forceRefreshPullRequestUrls.has(url))
    )
  );

  const pullRequestsByUrl = new Map<string, WorkflowPullRequestSummary>();
  pullRequestResults.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      pullRequestsByUrl.set(pullRequestUrls[index], result.value);
    }
  });

  return issues
    .map<WorkflowIssueSummary>((issue) => {
      const projectConfig = repoMap.get(issue.repo) || fallbackRepoWorkflowConfig(issue.repo, issue.project);
      const execution = executionContext.latestExecutionByIssueUrl.get(issue.htmlUrl);
      const inShippingQueue = execution ? executionContext.shippingCellIds.has(execution.id) : false;
      const linkedPullRequest =
        execution?.githubPrUrl ? pullRequestsByUrl.get(execution.githubPrUrl) || null : null;
      const derived = deriveWorkflowState({
        labels: issue.labels,
        githubState: issue.githubState,
        executionStatus: execution?.status,
        pullRequest: linkedPullRequest,
        inShippingQueue,
        projectConfig,
      });

      return {
        ...issue,
        workflowState: derived.state,
        workflowSource: derived.source,
        linkedExecution: normalizeCell(execution),
        linkedPullRequest,
        inShippingQueue,
        shippingMode: projectConfig.shippingMode,
        shippingBranch: projectConfig.shippingBranch,
        mainBranch: projectConfig.mainBranch,
      };
    })
    .filter((issue) => {
      if (issue.githubState === 'open') return true;
      if (issue.workflowState === 'promotion' || issue.workflowState === 'shipping' || issue.workflowState === 'done') {
        return true;
      }
      return Boolean(options?.includeClosedBacklog);
    })
    .sort((a, b) => {
      const projectComparison = a.project.localeCompare(b.project);
      if (projectComparison !== 0) return projectComparison;
      return compareDateDesc(a.updatedAt, b.updatedAt);
    });
}

export async function getWorkflowOverview(options?: { refresh?: boolean }) {
  const issues = await listWorkflowIssues({ refresh: options?.refresh });
  const repoMap = loadRepoWorkflowConfigMap();
  const projectNames = [...new Set([...repoMap.values()].map((config) => config.project))].sort(
    (a, b) => a.localeCompare(b)
  );

  const projects = projectNames.map((projectName) => {
    const projectIssues = issues
      .filter((issue) => issue.project === projectName)
      .sort((a, b) => compareDateDesc(a.updatedAt, b.updatedAt));

    const states = Object.fromEntries(
      WORKFLOW_STATES.map((state) => [
        state,
        projectIssues.filter((issue) => issue.workflowState === state),
      ])
    ) as Record<WorkflowState, WorkflowIssueSummary[]>;

    const projectRepo =
      [...repoMap.values()].find((config) => config.project === projectName)?.repo || '';

    return {
      name: projectName,
      repo: projectRepo,
      issueCount: projectIssues.length,
      executionCount: projectIssues.filter((issue) => issue.linkedExecution).length,
      states,
    };
  });

  const totals = Object.fromEntries(
    WORKFLOW_STATES.map((state) => [
      state,
      issues.filter((issue) => issue.workflowState === state).length,
    ])
  ) as Record<WorkflowState, number>;

  return {
    updatedAt: new Date().toISOString(),
    states: WORKFLOW_STATES,
    totals,
    projects,
  };
}

export async function getWorkflowIssueDetail(issueRef: string) {
  const { repo, number } = parseIssueRef(issueRef);
  const projectConfig = loadRepoWorkflowConfigMap().get(repo) || fallbackRepoWorkflowConfig(repo);
  const project = projectConfig.project;

  const octokit = getOctokit();
  const [owner, name] = repo.split('/');
  const issueResponse = await octokit.issues.get({
    owner,
    repo: name,
    issue_number: number,
  });

  if (issueResponse.data.pull_request) {
    throw new Error(`Issue ref ${issueRef} points to a pull request`);
  }

  const commentsResponse = await octokit.issues.listComments({
    owner,
    repo: name,
    issue_number: number,
    per_page: 50,
  });

  const executionContext = await fetchExecutionContext();
  const execution = executionContext.latestExecutionByIssueUrl.get(issueResponse.data.html_url);
  const inShippingQueue = execution ? executionContext.shippingCellIds.has(execution.id) : false;
  const linkedPullRequest =
    execution?.githubPrUrl
      ? await fetchPullRequestForUrl(
          octokit,
          execution.githubPrUrl,
          shouldRefreshPullRequest({
            issueState: issueResponse.data.state as 'open' | 'closed',
            issueClosedAt: issueResponse.data.closed_at,
            executionStatus: execution.status,
            labels: issueResponse.data.labels
              .map((label) => (typeof label === 'string' ? label : label.name || ''))
              .filter(Boolean),
          })
        ).catch(() => null)
      : null;
  const derived = deriveWorkflowState({
    labels: issueResponse.data.labels
      .map((label) => (typeof label === 'string' ? label : label.name || ''))
      .filter(Boolean),
    githubState: issueResponse.data.state as 'open' | 'closed',
    executionStatus: execution?.status,
    pullRequest: linkedPullRequest,
    inShippingQueue,
    projectConfig,
  });

  let history: CellHistoryRow[] = [];
  if (execution) {
    history = (await db
      .select()
      .from(cellStatusHistory)
      .where(eq(cellStatusHistory.cellId, execution.id))
      .orderBy(cellStatusHistory.changedAt)) as CellHistoryRow[];
  }

  return {
    id: issueResponse.data.id,
    number: issueResponse.data.number,
    title: issueResponse.data.title,
    body: issueResponse.data.body || '',
    labels: issueResponse.data.labels
      .map((label) => (typeof label === 'string' ? label : label.name || ''))
      .filter(Boolean),
    repo,
    project,
    htmlUrl: issueResponse.data.html_url,
    issueRef,
    createdAt: issueResponse.data.created_at,
    updatedAt: issueResponse.data.updated_at,
    closedAt: issueResponse.data.closed_at,
    githubState: issueResponse.data.state as 'open' | 'closed',
    user: issueResponse.data.user?.login || '',
    assignee: issueResponse.data.assignee?.login || null,
    comments: issueResponse.data.comments,
    workflowState: derived.state,
    workflowSource: derived.source,
    linkedExecution: normalizeCell(execution),
    linkedPullRequest,
    inShippingQueue,
    shippingMode: projectConfig.shippingMode,
    shippingBranch: projectConfig.shippingBranch,
    mainBranch: projectConfig.mainBranch,
    commentsList: commentsResponse.data.map((comment) => ({
      id: comment.id,
      author: comment.user?.login || '',
      body: comment.body || '',
      createdAt: comment.created_at,
    })),
    history: history.map((item) => ({
      id: item.id,
      fromStatus: item.fromStatus,
      toStatus: item.toStatus,
      changedAt: item.changedAt?.toISOString() || null,
      note: item.note,
    })),
  } satisfies WorkflowIssueDetail;
}

export async function updateWorkflowIssue(
  issueRef: string,
  updates: {
    title?: string;
    body?: string;
    comment?: string;
    assignee?: string | null;
    githubState?: 'open' | 'closed';
    workflowState?: MutableWorkflowState;
    scope?: object | null;
    blocker?: string | null;
    handoff?: string | null;
    githubPrUrl?: string | null;
    inShippingQueue?: boolean;
  }
) {
  const detail = await getWorkflowIssueDetail(issueRef);
  const { repo, number } = parseIssueRef(issueRef);
  const [owner, name] = repo.split('/');
  const octokit = getOctokit();

  if (
    updates.title !== undefined ||
    updates.body !== undefined ||
    updates.assignee !== undefined ||
    updates.githubState !== undefined
  ) {
    await octokit.issues.update({
      owner,
      repo: name,
      issue_number: number,
      title: updates.title ?? detail.title,
      body: updates.body ?? detail.body,
      state: updates.githubState ?? detail.githubState,
      assignees:
        updates.assignee === undefined
          ? detail.assignee
            ? [detail.assignee]
            : []
          : updates.assignee
            ? [updates.assignee]
            : [],
    });
  }

  if (updates.githubState === 'closed') {
    await octokit.issues.setLabels({
      owner,
      repo: name,
      issue_number: number,
      labels: detail.labels.filter((label) => !ISSUE_STATE_LABELS.includes(label as never)),
    });
  }

  if (updates.comment) {
    await octokit.issues.createComment({
      owner,
      repo: name,
      issue_number: number,
      body: updates.comment,
    });
  }

  if (updates.workflowState !== undefined) {
    const nextLabel = workflowStateLabel(updates.workflowState);
    const nextLabels = detail.labels.filter((label) => !ISSUE_STATE_LABELS.includes(label as never));
    if (nextLabel) {
      nextLabels.push(nextLabel);
    }

    await octokit.issues.setLabels({
      owner,
      repo: name,
      issue_number: number,
      labels: nextLabels,
    });

    if (detail.linkedExecution) {
      const cellStatusMap: Record<MutableWorkflowState, CellStatus | null> = {
        backlog: null,
        ready: 'queued',
        'in-progress': 'active',
        blocked: 'blocked',
        review: 'awaiting-review',
        done: 'merged',
      };
      const nextStatus = cellStatusMap[updates.workflowState];

      if (!nextStatus) {
        throw new Error('Cannot move a linked execution record back to backlog');
      }

      if (detail.linkedExecution.status !== nextStatus) {
        await db
          .update(cells)
          .set({ status: nextStatus, updatedAt: new Date() })
          .where(eq(cells.id, detail.linkedExecution.id));

        await db.insert(cellStatusHistory).values({
          cellId: detail.linkedExecution.id,
          fromStatus: detail.linkedExecution.status,
          toStatus: nextStatus,
          note: 'Updated from workflow workspace',
        });
      }
    }
  }

  if (detail.linkedExecution) {
    const cellUpdates: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.scope !== undefined) cellUpdates.scope = updates.scope;
    if (updates.blocker !== undefined) cellUpdates.blocker = updates.blocker;
    if (updates.handoff !== undefined) cellUpdates.handoff = updates.handoff;
    if (updates.githubPrUrl !== undefined) cellUpdates.githubPrUrl = updates.githubPrUrl;

    if (Object.keys(cellUpdates).length > 1) {
      await db
        .update(cells)
        .set(cellUpdates)
        .where(eq(cells.id, detail.linkedExecution.id));
    }

    if (updates.inShippingQueue !== undefined) {
      if (detail.shippingMode !== 'approval') {
        throw new Error('Manual shipping approval only applies to projects that merge directly to main');
      }

      const existingQueueEntry = await db
        .select()
        .from(mergeQueue)
        .where(eq(mergeQueue.cellId, detail.linkedExecution.id));

      if (updates.inShippingQueue && existingQueueEntry.length === 0) {
        const maxPositionRow = await db
          .select({ position: mergeQueue.position })
          .from(mergeQueue)
          .orderBy(mergeQueue.position);
        const nextPosition =
          maxPositionRow.length === 0 ? 1 : maxPositionRow[maxPositionRow.length - 1].position + 1;
        await db.insert(mergeQueue).values({
          cellId: detail.linkedExecution.id,
          position: nextPosition,
          dependsOn: null,
        });
      }

      if (!updates.inShippingQueue && existingQueueEntry.length > 0) {
        await db
          .delete(mergeQueue)
          .where(eq(mergeQueue.cellId, detail.linkedExecution.id));
      }
    }
  }

  cache.delete(repo);
  if (detail.linkedExecution?.githubPrUrl) {
    pullRequestCache.delete(detail.linkedExecution.githubPrUrl);
  }
  return getWorkflowIssueDetail(issueRef);
}

export async function createExecutionForIssue(
  issueRef: string,
  input?: { feature?: string; branch?: string; scope?: object | null }
) {
  const detail = await getWorkflowIssueDetail(issueRef);
  if (detail.linkedExecution) {
    throw new Error('Issue already has a linked execution record');
  }

  if (!detail.project) {
    throw new Error('Issue is not mapped to a configured project');
  }

  const feature = input?.feature?.trim() || detail.title;
  const branch =
    input?.branch?.trim() ||
    `feat/${feature
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}`;

  const [execution] = await db
    .insert(cells)
    .values({
      feature,
      project: detail.project,
      branch,
      status: 'queued',
      scope: input?.scope || null,
      githubIssueUrl: detail.htmlUrl,
    })
    .returning();

  await db.insert(cellStatusHistory).values({
    cellId: execution.id,
    fromStatus: null,
    toStatus: 'queued',
    note: 'Created from workflow issue workspace',
  });

  cache.delete(detail.repo);
  return getWorkflowIssueDetail(issueRef);
}
