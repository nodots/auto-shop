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

/**
 * Parse a comma-separated excludeLabels query parameter into a normalized
 * array of lowercase label strings.
 */
export function parseExcludeLabels(param: string | undefined): string[] {
  if (!param) return [];
  return param
    .split(',')
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Filter out repair orders that carry any of the excluded labels.
 * Comparison is case-insensitive.
 */
export function filterByExcludedLabels(
  issues: RepairOrder[],
  excludeLabels: string[],
): RepairOrder[] {
  if (excludeLabels.length === 0) return issues;
  return issues.filter(
    (issue) => !issue.labels.some((label) => excludeLabels.includes(label.toLowerCase())),
  );
}
