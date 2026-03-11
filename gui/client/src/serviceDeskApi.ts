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

// Shop floor
export const fetchShopFloor = () => fetchJson<ShopFloorData>('/shop-floor');

// Accounts
export const fetchAccountsRaw = () => fetchJson<Record<string, AccountData>>('/accounts/raw');
export const fetchAccounts = () => fetchJson<AccountRow[]>('/accounts');
export const syncAccounts = () => fetchJson<{ synced: number }>('/accounts/sync', { method: 'POST' });

// Bays
export const fetchBays = (params?: { status?: string; account?: string }) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.account) qs.set('account', params.account);
  const query = qs.toString();
  return fetchJson<BayRow[]>(`/bays${query ? '?' + query : ''}`);
};

export const fetchBay = (id: number) => fetchJson<BayRow & { history: BayStatusHistoryRow[] }>(`/bays/${id}`);

export const openBay = (data: { feature: string; project: string; branch: string; scope?: object; githubIssueUrl?: string }) =>
  fetchJson<BayRow>('/bays', { method: 'POST', body: JSON.stringify(data) });

export const updateBayStatus = (id: number, status: string, note?: string) =>
  fetchJson<BayRow>(`/bays/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) });

export const updateBay = (id: number, data: Partial<Pick<BayRow, 'scope' | 'blocker' | 'handoff' | 'githubIssueUrl' | 'githubPrUrl'>>) =>
  fetchJson<BayRow>(`/bays/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const clearBay = (id: number) =>
  fetchJson<{ deleted: BayRow }>(`/bays/${id}`, { method: 'DELETE' });

// Release lane
export const fetchReleaseLane = () => fetchJson<ReleaseLaneRow[]>('/release-lane');
export const addToReleaseLane = (bayId: number, dependsOn?: number[]) =>
  fetchJson<ReleaseLaneRow>('/release-lane', { method: 'POST', body: JSON.stringify({ cell_id: bayId, depends_on: dependsOn }) });
export const reorderReleaseLane = (order: { id: number; position: number }[]) =>
  fetchJson<ReleaseLaneRow[]>('/release-lane/reorder', { method: 'PATCH', body: JSON.stringify({ order }) });
export const removeFromReleaseLane = (id: number) =>
  fetchJson<{ deleted: ReleaseLaneRow }>(`/release-lane/${id}`, { method: 'DELETE' });

// Repair orders
export const fetchRepairOrders = (params?: { account?: string; refresh?: boolean; excludeLabels?: string[] }) => {
  const qs = new URLSearchParams();
  if (params?.account) qs.set('account', params.account);
  if (params?.refresh) qs.set('refresh', 'true');
  if (params?.excludeLabels && params.excludeLabels.length > 0) qs.set('excludeLabels', params.excludeLabels.join(','));
  const query = qs.toString();
  return fetchJson<RepairOrder[]>(`/repair-orders${query ? '?' + query : ''}`);
};

// Dispatch board
export const fetchDispatchBoardStatus = () => fetchJson<DispatchBoardStatus>('/dispatch/status');
export const pauseDispatch = () => fetchJson<{ paused: boolean }>('/dispatch/pause', { method: 'POST' });
export const resumeDispatch = () => fetchJson<{ paused: boolean }>('/dispatch/resume', { method: 'POST' });
export const scanWaitingLot = () => fetchJson<{ triggered: boolean }>('/dispatch/scan', { method: 'POST' });
export const stopDispatch = () => fetchJson<{ status: string }>('/dispatch/stop', { method: 'POST' });
export const removeFromDispatchBoard = (issueRef: string) =>
  fetchJson<{ removed: boolean }>(`/dispatch/queue/${encodeURIComponent(issueRef)}`, { method: 'DELETE' });
export const stopTechnicianSession = (issueRef: string) =>
  fetchJson<{ killed: boolean }>(`/dispatch/kill/${encodeURIComponent(issueRef)}`, { method: 'POST' });
export const fetchDispatchLog = (issueRef: string, lines = 100) =>
  fetchJson<{ issueRef: string; log: string }>(`/dispatch/logs/${encodeURIComponent(issueRef)}?lines=${lines}`);

// Types
export interface ShopFloorData {
  capacity: { active: number; max: number };
  counts: Record<string, number>;
  blockedCells: BayRow[];
  readyPRs: BayRow[];
  recentActivity: (BayStatusHistoryRow & { feature: string; project: string })[];
}

export interface AccountData {
  repo: string;
  localPath: string;
  defaultBranch: string;
  featureTarget: string;
  promotionPath: string[];
  scopeTemplate: string | null;
  packages?: Record<string, { repo: string; path: string; featureTarget?: string; scopeOverrides?: object }>;
}

export interface AccountRow {
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

export interface BayRow {
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

export interface BayStatusHistoryRow {
  id: number;
  cellId: number;
  fromStatus: string | null;
  toStatus: string;
  changedAt: string;
  note: string | null;
}

export interface DispatchSession {
  issueRef: string;
  repo: string;
  number: number;
  title: string;
  branch: string;
  pid: number;
  logFile: string;
  startedAt: string;
}

export interface DispatchQueueItem {
  issueRef: string;
  repo: string;
  number: number;
  title: string;
  discoveredAt: string;
}

export interface DispatchCompletion {
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

export interface DispatchBoardStatus {
  status: string;
  startedAt: string | null;
  lastScanAt: string | null;
  paused: boolean;
  activeSessions: DispatchSession[];
  activeCount: number;
  maxSessions: number;
  queue: DispatchQueueItem[];
  queueSize: number;
  completed: DispatchCompletion[];
}

export interface RepairOrder {
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

export interface ReleaseLaneRow {
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
