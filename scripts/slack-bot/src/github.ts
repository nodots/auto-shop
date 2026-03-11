/**
 * GitHub REST API client for the Slack bot.
 * Uses fetch directly (no gh CLI in Cloudflare Workers).
 */

export interface GitHubIssue {
  number: number;
  title: string;
  html_url: string;
  labels: Array<{ name: string }>;
  state: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  html_url: string;
  state: string;
  head: { ref: string };
  draft: boolean;
  mergeable: boolean | null;
  merged: boolean;
}

interface GitHubClientOptions {
  token: string;
  owner: string;
  repo: string;
}

export class GitHubClient {
  private token: string;
  private owner: string;
  private repo: string;
  private baseUrl = 'https://api.github.com';

  constructor(options: GitHubClientOptions) {
    this.token = options.token;
    this.owner = options.owner;
    this.repo = options.repo;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'auto-shop-slack-bot',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API error ${response.status}: ${body}`);
    }

    return response.json() as Promise<T>;
  }

  async listIssuesByLabel(label: string): Promise<GitHubIssue[]> {
    return this.request<GitHubIssue[]>(
      `/repos/${this.owner}/${this.repo}/issues?labels=${encodeURIComponent(label)}&state=open&per_page=50`
    );
  }

  async getIssue(number: number): Promise<GitHubIssue> {
    return this.request<GitHubIssue>(
      `/repos/${this.owner}/${this.repo}/issues/${number}`
    );
  }

  async getPR(number: number): Promise<GitHubPR> {
    return this.request<GitHubPR>(
      `/repos/${this.owner}/${this.repo}/pulls/${number}`
    );
  }

  async approvePR(number: number): Promise<void> {
    await this.request(
      `/repos/${this.owner}/${this.repo}/pulls/${number}/reviews`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'APPROVE' }),
      }
    );
  }

  async mergePR(number: number): Promise<{ merged: boolean; message: string }> {
    return this.request<{ merged: boolean; message: string }>(
      `/repos/${this.owner}/${this.repo}/pulls/${number}/merge`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merge_method: 'squash' }),
      }
    );
  }

  /** Get all cells grouped by status label */
  async getCellStatus(): Promise<{
    active: GitHubIssue[];
    blocked: GitHubIssue[];
    queued: GitHubIssue[];
    awaitingReview: GitHubIssue[];
  }> {
    const [active, blocked, queued, awaitingReview] = await Promise.all([
      this.listIssuesByLabel('cell:active'),
      this.listIssuesByLabel('cell:blocked'),
      this.listIssuesByLabel('cell:queued'),
      this.listIssuesByLabel('cell:awaiting-review'),
    ]);
    return { active, blocked, queued, awaitingReview };
  }
}
