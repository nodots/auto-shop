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

// Projects
export const fetchProjectsRaw = () => fetchJson<Record<string, ProjectData>>('/projects/raw');
export const fetchProjects = () => fetchJson<ProjectRow[]>('/projects');
export const syncProjects = () => fetchJson<{ synced: number }>('/projects/sync', { method: 'POST' });

// Cells
export const fetchCells = (params?: { status?: string; project?: string }) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.project) qs.set('project', params.project);
  const query = qs.toString();
  return fetchJson<CellRow[]>(`/cells${query ? '?' + query : ''}`);
};

export const fetchCell = (id: number) => fetchJson<CellRow & { history: StatusHistoryRow[] }>(`/cells/${id}`);

export const createCell = (data: { feature: string; project: string; branch: string; scope?: object; githubIssueUrl?: string }) =>
  fetchJson<CellRow>('/cells', { method: 'POST', body: JSON.stringify(data) });

export const updateCellStatus = (id: number, status: string, note?: string) =>
  fetchJson<CellRow>(`/cells/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) });

export const updateCell = (id: number, data: Partial<Pick<CellRow, 'scope' | 'blocker' | 'handoff' | 'githubIssueUrl' | 'githubPrUrl'>>) =>
  fetchJson<CellRow>(`/cells/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteCell = (id: number) =>
  fetchJson<{ deleted: CellRow }>(`/cells/${id}`, { method: 'DELETE' });

// Merge queue
export const fetchMergeQueue = () => fetchJson<MergeQueueRow[]>('/merge-queue');
export const addToMergeQueue = (cellId: number, dependsOn?: number[]) =>
  fetchJson<MergeQueueRow>('/merge-queue', { method: 'POST', body: JSON.stringify({ cell_id: cellId, depends_on: dependsOn }) });
export const reorderMergeQueue = (order: { id: number; position: number }[]) =>
  fetchJson<MergeQueueRow[]>('/merge-queue/reorder', { method: 'PATCH', body: JSON.stringify({ order }) });
export const removeFromMergeQueue = (id: number) =>
  fetchJson<{ deleted: MergeQueueRow }>(`/merge-queue/${id}`, { method: 'DELETE' });

// Scheduler
export const fetchSchedulerStatus = () => fetchJson<SchedulerStatus>('/scheduler/status');
export const pauseScheduler = () => fetchJson<{ paused: boolean }>('/scheduler/pause', { method: 'POST' });
export const resumeScheduler = () => fetchJson<{ paused: boolean }>('/scheduler/resume', { method: 'POST' });
export const triggerScan = () => fetchJson<{ triggered: boolean }>('/scheduler/scan', { method: 'POST' });
export const stopScheduler = () => fetchJson<{ status: string }>('/scheduler/stop', { method: 'POST' });
export const removeFromSchedulerQueue = (issueRef: string) =>
  fetchJson<{ removed: boolean }>(`/scheduler/queue/${encodeURIComponent(issueRef)}`, { method: 'DELETE' });
export const killSession = (issueRef: string) =>
  fetchJson<{ killed: boolean }>(`/scheduler/kill/${encodeURIComponent(issueRef)}`, { method: 'POST' });
export const fetchSessionLog = (issueRef: string, lines = 100) =>
  fetchJson<{ issueRef: string; log: string }>(`/scheduler/logs/${encodeURIComponent(issueRef)}?lines=${lines}`);

// Types
export interface DashboardData {
  capacity: { active: number; max: number };
  counts: Record<string, number>;
  blockedCells: CellRow[];
  readyPRs: CellRow[];
  recentActivity: (StatusHistoryRow & { feature: string; project: string })[];
}

export interface ProjectData {
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

export interface CellRow {
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

export interface StatusHistoryRow {
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
}

export interface SchedulerQueueItem {
  issueRef: string;
  repo: string;
  number: number;
  title: string;
  discoveredAt: string;
}

export interface SchedulerCompleted {
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
  completed: SchedulerCompleted[];
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
