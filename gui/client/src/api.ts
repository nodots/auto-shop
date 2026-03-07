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

export const createCell = (data: { feature: string; project: string; branch: string; scope?: object; github_issue_url?: string }) =>
  fetchJson<CellRow>('/cells', { method: 'POST', body: JSON.stringify(data) });

export const updateCellStatus = (id: number, status: string, note?: string) =>
  fetchJson<CellRow>(`/cells/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) });

export const updateCell = (id: number, data: Partial<Pick<CellRow, 'scope' | 'blocker' | 'handoff' | 'github_issue_url' | 'github_pr_url'>>) =>
  fetchJson<CellRow>(`/cells/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteCell = (id: number) =>
  fetchJson<{ deleted: CellRow }>(`/cells/${id}`, { method: 'DELETE' });

// Merge queue
export const fetchMergeQueue = () => fetchJson<MergeQueueRow[]>('/merge-queue');
export const addToMergeQueue = (cell_id: number, depends_on?: number[]) =>
  fetchJson<MergeQueueRow>('/merge-queue', { method: 'POST', body: JSON.stringify({ cell_id, depends_on }) });
export const reorderMergeQueue = (order: { id: number; position: number }[]) =>
  fetchJson<MergeQueueRow[]>('/merge-queue/reorder', { method: 'PATCH', body: JSON.stringify({ order }) });
export const removeFromMergeQueue = (id: number) =>
  fetchJson<{ deleted: MergeQueueRow }>(`/merge-queue/${id}`, { method: 'DELETE' });

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
  local_path: string;
  default_branch: string;
  feature_target: string;
  promotion_path: string[];
  scope_template: string | null;
  packages: { name: string; repo: string; path: string; featureTarget?: string; scopeOverrides?: object }[] | null;
  synced_at: string;
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
  github_issue_url: string | null;
  github_pr_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusHistoryRow {
  id: number;
  cell_id: number;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  note: string | null;
}

export interface MergeQueueRow {
  id: number;
  cell_id: number;
  position: number;
  depends_on: number[] | null;
  added_at: string;
  feature: string;
  project: string;
  branch: string;
  status: string;
  github_pr_url: string | null;
}
