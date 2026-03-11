import { Router } from 'express';
import { Octokit } from '@octokit/rest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { db } from '../db.js';
import { cells } from '../db/schema.js';

const router = Router();

interface ProjectsConfig {
  projects: Record<string, {
    repo: string;
    packages?: Record<string, { repo: string }>;
  }>;
}

interface CachedIssues {
  data: RepairOrder[];
  fetchedAt: number;
}

interface RepairOrder {
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

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CachedIssues>();

function loadRepoMap(): Map<string, string> {
  const configPath = resolve(import.meta.dirname, '..', '..', '..', '..', 'projects.json');
  const raw = JSON.parse(readFileSync(configPath, 'utf-8')) as ProjectsConfig;
  const repoMap = new Map<string, string>();

  for (const [projectName, config] of Object.entries(raw.projects)) {
    repoMap.set(config.repo, projectName);
    if (config.packages) {
      for (const pkg of Object.values(config.packages)) {
        repoMap.set(pkg.repo, projectName);
      }
    }
  }
  return repoMap;
}

// GET /api/repair-orders
router.get('/', async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    res.status(503).json({ error: 'GITHUB_TOKEN environment variable is not set' });
    return;
  }

  const projectFilter = (req.query.account || req.query.project) as string | undefined;
  const forceRefresh = req.query.refresh === 'true';
  const excludeLabelsParam = req.query.excludeLabels as string | undefined;
  const excludeLabels = excludeLabelsParam
    ? excludeLabelsParam.split(',').map((l) => l.trim().toLowerCase()).filter(Boolean)
    : [];

  try {
    const repoMap = loadRepoMap();
    const octokit = new Octokit({ auth: token });

    // Determine which repos to fetch
    const repos = [...repoMap.entries()]
      .filter(([, proj]) => !projectFilter || proj === projectFilter)
      .map(([repo, proj]) => ({ repo, project: proj }));

    // Fetch issues, using cache where possible
    const results = await Promise.allSettled(
      repos.map(async ({ repo, project }) => {
        const cacheKey = repo;
        const cached = cache.get(cacheKey);
        if (!forceRefresh && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
          return cached.data;
        }

        const [owner, name] = repo.split('/');
        const response = await octokit.issues.listForRepo({
          owner,
          repo: name,
          state: 'open',
          per_page: 100,
        });

        const issues: RepairOrder[] = response.data
          .filter((issue) => !issue.pull_request)
          .map((issue) => ({
            id: issue.id,
            number: issue.number,
            title: issue.title,
            labels: issue.labels
              .map((l) => (typeof l === 'string' ? l : l.name || ''))
              .filter(Boolean),
            repo,
            project,
            html_url: issue.html_url,
            created_at: issue.created_at,
            updated_at: issue.updated_at,
            user: issue.user?.login || '',
            assignee: issue.assignee?.login || null,
            comments: issue.comments,
            inCell: false,
          }));

        cache.set(cacheKey, { data: issues, fetchedAt: Date.now() });
        return issues;
      }),
    );

    // Collect all successful results
    const allIssues: RepairOrder[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allIssues.push(...result.value);
      }
    }

    // Cross-reference with cells table to mark issues already in a cell
    try {
      const existingCells = await db.select({ githubIssueUrl: cells.githubIssueUrl }).from(cells);
      const cellUrls = new Set(
        existingCells
          .map((c) => c.githubIssueUrl)
          .filter(Boolean),
      );
      for (const issue of allIssues) {
        if (cellUrls.has(issue.html_url)) {
          issue.inCell = true;
        }
      }
    } catch {
      // DB may not be available; skip cross-reference
    }

    // Filter out issues matching excluded labels
    const filtered = excludeLabels.length > 0
      ? allIssues.filter((issue) =>
          !issue.labels.some((label) => excludeLabels.includes(label.toLowerCase()))
        )
      : allIssues;

    // Sort by updated_at descending
    filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
