import { describe, it, expect } from 'vitest';
import {
  parseExcludeLabels,
  filterByExcludedLabels,
  type RepairOrder,
} from '../repairOrderFilters.js';

function makeOrder(overrides: Partial<RepairOrder> = {}): RepairOrder {
  return {
    id: 1,
    number: 1,
    title: 'Test issue',
    labels: [],
    repo: 'nodots/auto-shop',
    project: 'auto-shop',
    html_url: 'https://github.com/nodots/auto-shop/issues/1',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    user: 'nodots',
    assignee: null,
    comments: 0,
    inCell: false,
    ...overrides,
  };
}

describe('parseExcludeLabels', () => {
  it('returns empty array for undefined', () => {
    expect(parseExcludeLabels(undefined)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseExcludeLabels('')).toEqual([]);
  });

  it('parses a single label', () => {
    expect(parseExcludeLabels('epic')).toEqual(['epic']);
  });

  it('parses comma-separated labels and trims whitespace', () => {
    expect(parseExcludeLabels('epic, wontfix , duplicate')).toEqual([
      'epic',
      'wontfix',
      'duplicate',
    ]);
  });

  it('lowercases labels', () => {
    expect(parseExcludeLabels('Epic,WONTFIX')).toEqual(['epic', 'wontfix']);
  });

  it('filters out empty segments from trailing commas', () => {
    expect(parseExcludeLabels('epic,,wontfix,')).toEqual(['epic', 'wontfix']);
  });
});

describe('filterByExcludedLabels', () => {
  it('returns all issues when no labels are excluded', () => {
    const issues = [
      makeOrder({ id: 1, labels: ['epic'] }),
      makeOrder({ id: 2, labels: ['bug'] }),
    ];
    expect(filterByExcludedLabels(issues, [])).toHaveLength(2);
  });

  it('excludes issues with the epic label', () => {
    const issues = [
      makeOrder({ id: 1, labels: ['epic', 'feature-cell'] }),
      makeOrder({ id: 2, labels: ['bug'] }),
      makeOrder({ id: 3, labels: ['improvement'] }),
    ];
    const result = filterByExcludedLabels(issues, ['epic']);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual([2, 3]);
  });

  it('is case-insensitive when matching labels', () => {
    const issues = [
      makeOrder({ id: 1, labels: ['Epic'] }),
      makeOrder({ id: 2, labels: ['EPIC'] }),
      makeOrder({ id: 3, labels: ['bug'] }),
    ];
    const result = filterByExcludedLabels(issues, ['epic']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  it('excludes issues matching any of multiple excluded labels', () => {
    const issues = [
      makeOrder({ id: 1, labels: ['epic'] }),
      makeOrder({ id: 2, labels: ['wontfix'] }),
      makeOrder({ id: 3, labels: ['bug'] }),
    ];
    const result = filterByExcludedLabels(issues, ['epic', 'wontfix']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  it('keeps issues that have no labels', () => {
    const issues = [
      makeOrder({ id: 1, labels: [] }),
      makeOrder({ id: 2, labels: ['epic'] }),
    ];
    const result = filterByExcludedLabels(issues, ['epic']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('returns empty array when all issues are excluded', () => {
    const issues = [
      makeOrder({ id: 1, labels: ['epic'] }),
      makeOrder({ id: 2, labels: ['epic', 'feature-cell'] }),
    ];
    expect(filterByExcludedLabels(issues, ['epic'])).toHaveLength(0);
  });
});
