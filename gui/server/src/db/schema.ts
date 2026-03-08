import { pgTable, serial, text, integer, jsonb, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').unique().notNull(),
  repo: text('repo').notNull(),
  localPath: text('local_path'),
  defaultBranch: text('default_branch').notNull().default('main'),
  featureTarget: text('feature_target').notNull().default('main'),
  promotionPath: text('promotion_path').array().notNull().default(sql`'{}'`),
  scopeTemplate: text('scope_template'),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow(),
});

export const packages = pgTable('packages', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  repo: text('repo').notNull(),
  path: text('path').notNull(),
  featureTarget: text('feature_target'),
  scopeOverrides: jsonb('scope_overrides'),
});

export const cells = pgTable('cells', {
  id: serial('id').primaryKey(),
  feature: text('feature').notNull(),
  project: text('project').notNull(),
  branch: text('branch').notNull(),
  status: text('status', { enum: ['queued', 'active', 'blocked', 'awaiting-review', 'merged'] }).notNull().default('queued'),
  scope: jsonb('scope'),
  blocker: text('blocker'),
  handoff: text('handoff'),
  githubIssueUrl: text('github_issue_url'),
  githubPrUrl: text('github_pr_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const cellStatusHistory = pgTable('cell_status_history', {
  id: serial('id').primaryKey(),
  cellId: integer('cell_id').references(() => cells.id, { onDelete: 'cascade' }),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow(),
  note: text('note'),
});

export const mergeQueue = pgTable('merge_queue', {
  id: serial('id').primaryKey(),
  cellId: integer('cell_id').references(() => cells.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  dependsOn: integer('depends_on').array(),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow(),
});
