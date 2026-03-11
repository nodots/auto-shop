'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function resolveSchedulerDir() {
  try {
    const commonDir = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      cwd: path.resolve(__dirname, '..', '..'),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return path.join(path.dirname(commonDir), '.scheduler');
  } catch {
    return path.resolve(__dirname, '..', '..', '.scheduler');
  }
}

const SCHEDULER_DIR = resolveSchedulerDir();
const QUEUE_PATH = path.join(SCHEDULER_DIR, 'queue.json');

function ensureDir() {
  if (!fs.existsSync(SCHEDULER_DIR)) {
    fs.mkdirSync(SCHEDULER_DIR, { recursive: true });
  }
}

function load() {
  ensureDir();
  if (!fs.existsSync(QUEUE_PATH)) return [];
  return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
}

function save(items) {
  ensureDir();
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(items, null, 2) + '\n');
}

/**
 * Add an issue to the end of the queue if not already present.
 * Returns true if added, false if duplicate.
 */
function add(issue) {
  const items = load();
  if (items.some(i => i.issueRef === issue.issueRef)) return false;
  items.push({
    issueRef: issue.issueRef,
    repo: issue.repo,
    number: issue.number,
    title: issue.title,
    body: issue.body,
    discoveredAt: new Date().toISOString(),
  });
  save(items);
  return true;
}

/**
 * Take the next item from the front of the queue.
 * Returns the item or null if empty.
 */
function next() {
  const items = load();
  if (items.length === 0) return null;
  const item = items.shift();
  save(items);
  return item;
}

/**
 * Remove a specific issue from the queue by issueRef.
 * Returns true if removed.
 */
function remove(issueRef) {
  const items = load();
  const filtered = items.filter(i => i.issueRef !== issueRef);
  if (filtered.length === items.length) return false;
  save(filtered);
  return true;
}

/**
 * List all queued items.
 */
function list() {
  return load();
}

/**
 * Number of items in the queue.
 */
function size() {
  return load().length;
}

/**
 * Check if an issueRef is already in the queue.
 */
function has(issueRef) {
  return load().some(i => i.issueRef === issueRef);
}

module.exports = { add, next, remove, list, size, has, SCHEDULER_DIR };
