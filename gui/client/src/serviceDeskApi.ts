const BASE = '/api';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || res.statusText);
  }
  return res.json();
}

// Dashboard
export const fetchDashboard = () => fetchJson<DashboardData>('/dashboard');

// Workflow
export const fetchWorkflowOverview = (params?: { refresh?: boolean }) => {
  const qs = new URLSearchParams();
  if (params?.refresh) qs.set('refresh', 'true');
  const query = qs.toString();
  return fetchJson<WorkflowOverview>(`/workflow${query ? '?' + query : ''}`);
};

export const fetchWorkflowIssue = (issueRef: string) =>
  fetchJson<WorkflowIssueDetail>(`/workflow/issues/${encodeURIComponent(issueRef)}`);

export const updateWorkflowIssue = (
  issueRef: string,
  data: WorkflowIssueUpdateInput
) =>
  fetchJson<WorkflowIssueDetail>(`/workflow/issues/${encodeURIComponent(issueRef)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const createExecutionForIssue = (
  issueRef: string,
  data?: { feature?: string; branch?: string; scope?: object | null }
) =>
  fetchJson<WorkflowIssueDetail>(`/workflow/issues/${encodeURIComponent(issueRef)}/execution`, {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });

// Projects
export const fetchProjectsRaw = () => fetchJson<Record<string, ProjectConfig>>('/projects/raw');
export const fetchProjects = () => fetchJson<ProjectRow[]>('/projects');
export const syncProjects = () => fetchJson<{ synced: number }>('/projects/sync', { method: 'POST' });

// Executions (cells)
export const fetchExecutions = (params?: { status?: string; project?: string }) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.project) qs.set('project', params.project);
  const query = qs.toString();
  return fetchJson<ExecutionRow[]>(`/cells${query ? '?' + query : ''}`);
};

export const fetchExecution = (id: number) => fetchJson<ExecutionRow & { history: ExecutionStatusHistoryRow[] }>(`/cells/${id}`);

export const createExecution = (data: { feature: string; project: string; branch: string; scope?: object; githubIssueUrl?: string }) =>
  fetchJson<ExecutionRow>('/cells', { method: 'POST', body: JSON.stringify(data) });

export const updateExecutionStatus = (id: number, status: string, note?: string) =>
  fetchJson<ExecutionRow>(`/cells/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) });

export const updateExecution = (id: number, data: Partial<Pick<ExecutionRow, 'scope' | 'blocker' | 'handoff' | 'githubIssueUrl' | 'githubPrUrl'>>) =>
  fetchJson<ExecutionRow>(`/cells/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteExecution = (id: number) =>
  fetchJson<{ deleted: ExecutionRow }>(`/cells/${id}`, { method: 'DELETE' });

// Merge queue
export const fetchMergeQueue = () => fetchJson<MergeQueueRow[]>('/merge-queue');
export const addToMergeQueue = (cellId: number, dependsOn?: number[]) =>
  fetchJson<MergeQueueRow>('/merge-queue', { method: 'POST', body: JSON.stringify({ cell_id: cellId, depends_on: dependsOn }) });
export const reorderMergeQueue = (order: { id: number; position: number }[]) =>
  fetchJson<MergeQueueRow[]>('/merge-queue/reorder', { method: 'PATCH', body: JSON.stringify({ order }) });
export const removeFromMergeQueue = (id: number) =>
  fetchJson<{ deleted: MergeQueueRow }>(`/merge-queue/${id}`, { method: 'DELETE' });

// Issues (GitHub)
export const fetchIssues = (params?: { project?: string; refresh?: boolean; excludeLabels?: string[] }) => {
  const qs = new URLSearchParams();
  if (params?.project) qs.set('project', params.project);
  if (params?.refresh) qs.set('refresh', 'true');
  if (params?.excludeLabels && params.excludeLabels.length > 0) qs.set('excludeLabels', params.excludeLabels.join(','));
  const query = qs.toString();
  return fetchJson<GitHubIssue[]>(`/issues${query ? '?' + query : ''}`);
};

// Scheduler
export const fetchSchedulerStatus = () => fetchJson<SchedulerStatus>('/scheduler/status');
export const pauseScheduler = () => fetchJson<{ paused: boolean }>('/scheduler/pause', { method: 'POST' });
export const resumeScheduler = () => fetchJson<{ paused: boolean }>('/scheduler/resume', { method: 'POST' });
export const scanIssueQueue = () => fetchJson<{ triggered: boolean }>('/scheduler/scan', { method: 'POST' });
export const stopScheduler = () => fetchJson<{ status: string }>('/scheduler/stop', { method: 'POST' });
export const removeFromSchedulerQueue = (issueRef: string) =>
  fetchJson<{ removed: boolean }>(`/scheduler/queue/${encodeURIComponent(issueRef)}`, { method: 'DELETE' });
export const stopAgentSession = (issueRef: string) =>
  fetchJson<{ killed: boolean }>(`/scheduler/kill/${encodeURIComponent(issueRef)}`, { method: 'POST' });
export const fetchSessionLog = (issueRef: string, lines = 100) =>
  fetchJson<{ issueRef: string; log: string }>(`/scheduler/logs/${encodeURIComponent(issueRef)}?lines=${lines}`);

// Types
export interface DashboardData {
  capacity: { active: number; max: number };
  counts: Record<string, number>;
  blockedCells: ExecutionRow[];
  readyPRs: ExecutionRow[];
  recentActivity: (ExecutionStatusHistoryRow & { feature: string; project: string })[];
}

export interface WorkflowExecutionSummary {
  id: number;
  feature: string;
  project: string;
  branch: string;
  status: 'queued' | 'active' | 'blocked' | 'awaiting-review' | 'merged';
  scope: object | null;
  blocker: string | null;
  handoff: string | null;
  githubIssueUrl: string | null;
  githubPrUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WorkflowIssueSummary {
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
  workflowState: import('./workflow').WorkflowState;
  workflowSource: 'promotion' | 'approval' | 'execution' | 'label' | 'default';
  linkedExecution: WorkflowExecutionSummary | null;
  linkedPullRequest: {
    number: number;
    url: string;
    baseRefName: string;
    mergedAt: string | null;
    state: 'open' | 'closed';
  } | null;
  inShippingQueue: boolean;
  shippingMode: 'branch' | 'approval';
  shippingBranch: string | null;
  mainBranch: string;
}

export interface WorkflowProjectSummary {
  name: string;
  repo: string;
  issueCount: number;
  executionCount: number;
  states: Record<import('./workflow').WorkflowState, WorkflowIssueSummary[]>;
}

export interface WorkflowOverview {
  updatedAt: string;
  states: import('./workflow').WorkflowState[];
  totals: Record<import('./workflow').WorkflowState, number>;
  projects: WorkflowProjectSummary[];
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

export interface WorkflowIssueUpdateInput {
  title?: string;
  body?: string;
  comment?: string;
  assignee?: string | null;
  githubState?: 'open' | 'closed';
  workflowState?: import('./workflow').MutableWorkflowState;
  scope?: object | null;
  blocker?: string | null;
  handoff?: string | null;
  githubPrUrl?: string | null;
  inShippingQueue?: boolean;
}

export interface ProjectConfig {
  repo: string;
  localPath: string;
  defaultBranch: string;
  featureTarget: string;
  promotionPath: string[];
  scopeTemplate: string | null;
  packages?: Record<string, { repo: string; path: string; featureTarget?: string; scopeOverrides?: object }>;
}

export interface ProjectRow {
  id: number;
  name: string;
  repo: string;
  localPath: string;
  defaultBranch: string;
  featureTarget: string;
  promotionPath: string[];
  scopeTemplate: string | null;
  packages: { name: string; repo: string; path: string; featureTarget?: string; scopeOverrides?: object }[] | null;
  syncedAt: string;
}

export interface ExecutionRow {
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
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionStatusHistoryRow {
  id: number;
  cellId: number;
  fromStatus: string | null;
  toStatus: string;
  changedAt: string;
  note: string | null;
}

export interface SchedulerSession {
  issueRef: string;
  repo: string;
  number: number;
  title: string;
  branch: string;
  pid: number;
  logFile: string;
  startedAt: string;
  localPath: string;
  claudeSessionId: string | null;
  claudeProjectPath: string | null;
  lastActivityAt: string | null;
  latestActivitySummary: string | null;
  latestActivityType: string | null;
}

export interface SchedulerQueueItem {
  issueRef: string;
  repo: string;
  number: number;
  title: string;
  discoveredAt: string;
}

export interface SchedulerCompletion {
  issueRef: string;
  repo: string;
  number: number;
  title: string;
  branch: string;
  startedAt: string;
  completedAt: string;
  exitCode: number;
  logFile: string;
}

export interface SchedulerStatus {
  status: string;
  startedAt: string | null;
  lastScanAt: string | null;
  paused: boolean;
  activeSessions: SchedulerSession[];
  activeCount: number;
  maxSessions: number;
  queue: SchedulerQueueItem[];
  queueSize: number;
  completed: SchedulerCompletion[];
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  labels: string[];
  repo: string;
  project: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  user: string;
  assignee: string | null;
  comments: number;
  inCell: boolean;
}

export interface MergeQueueRow {
  id: number;
  cellId: number;
  position: number;
  dependsOn: number[] | null;
  addedAt: string;
  feature: string;
  project: string;
  branch: string;
  status: string;
  githubPrUrl: string | null;
}
