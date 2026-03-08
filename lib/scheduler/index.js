'use strict';

const fs = require('fs');
const path = require('path');
const scanner = require('./scanner');
const queue = require('./queue');
const sessions = require('./sessions');
const setup = require('./setup');
const api = require('./api');

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
const API_PORT = parseInt(process.env.SCHEDULER_PORT || '3401', 10);
const STATE_PATH = path.join(queue.SCHEDULER_DIR, 'state.json');
const PID_PATH = path.join(queue.SCHEDULER_DIR, 'scheduler.pid');

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function logError(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.error(`[${ts}] ERROR: ${msg}`);
}

const state = {
  status: 'running',
  paused: false,
  startedAt: new Date().toISOString(),
  lastScanAt: null,
  completed: [],
  triggerScan: null,
};

function saveState() {
  try {
    if (!fs.existsSync(queue.SCHEDULER_DIR)) {
      fs.mkdirSync(queue.SCHEDULER_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_PATH, JSON.stringify({
      status: state.status,
      paused: state.paused,
      startedAt: state.startedAt,
      lastScanAt: state.lastScanAt,
      activeSessions: sessions.list(),
      queue: queue.list(),
      completed: state.completed.slice(-50), // keep last 50
    }, null, 2) + '\n');
  } catch { /* best effort */ }
}

/**
 * Scan for new claude-ready issues and add them to the queue.
 */
function scanAndEnqueue() {
  log('Scanning for claude-ready issues...');
  state.lastScanAt = new Date().toISOString();

  try {
    const issues = scanner.scan();

    let added = 0;
    for (const issue of issues) {
      // Skip if already in queue or actively being worked on
      if (queue.has(issue.issueRef) || sessions.isActive(issue.issueRef)) continue;
      // Skip if recently completed (within this scheduler run)
      if (state.completed.some(c => c.issueRef === issue.issueRef)) continue;

      if (queue.add(issue)) {
        log(`  Queued: ${issue.issueRef} — ${issue.title}`);
        added++;
      }
    }

    if (added === 0 && issues.length === 0) {
      log('  No claude-ready issues found');
    } else if (added === 0) {
      log(`  ${issues.length} issue(s) found, all already tracked`);
    } else {
      log(`  Added ${added} new issue(s) to queue`);
    }
  } catch (err) {
    logError(`Scan failed: ${err.message}`);
  }

  saveState();
}

/**
 * Fill open session slots from the queue.
 */
function fillSlots() {
  if (state.paused) return;

  while (sessions.hasCapacity() && queue.size() > 0) {
    const issue = queue.next();
    if (!issue) break;

    log(`Starting session: ${issue.issueRef} — ${issue.title}`);

    try {
      // Full cell setup: branch, SCOPE.json, prompt
      const { localPath, branch, prompt } = setup.setupCell(issue);

      // Update GitHub labels
      setup.setLabel(issue.repo, issue.number, 'cell:active');

      // Launch claude --remote
      const session = sessions.start(issue, localPath, branch, prompt);
      if (!session) {
        logError(`  Failed to start session (at capacity)`);
        // Put it back in the queue
        queue.add(issue);
        break;
      }

      log(`  PID ${session.pid} — branch ${branch}`);
    } catch (err) {
      logError(`  Setup failed for ${issue.issueRef}: ${err.message}`);
      // Mark as awaiting-review so the coordinator can investigate
      setup.setLabel(issue.repo, issue.number, 'cell:blocked');
    }

    saveState();
  }
}

/**
 * Send JSON to the GUI server (best-effort).
 */
function guiRequest(method, path, body) {
  return new Promise((resolve) => {
    const http = require('http');
    const data = JSON.stringify(body);
    const req = http.request(`http://localhost:3400${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let chunks = '';
      res.on('data', (c) => { chunks += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(chunks)); } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.write(data);
    req.end();
  });
}

function guiPost(path, body) { return guiRequest('POST', path, body); }
function guiPatch(path, body) { return guiRequest('PATCH', path, body); }

/**
 * Handle session completion.
 */
async function handleSessionComplete(completed) {
  log(`Session completed: ${completed.issueRef} (exit code ${completed.exitCode})`);

  // Update GitHub label
  setup.setLabel(completed.repo, completed.number, 'cell:awaiting-review');

  state.completed.push(completed);

  // On success, create a cell record in the GUI DB and add to merge queue
  if (completed.exitCode === 0) {
    const issueUrl = `https://github.com/${completed.repo}/issues/${completed.number}`;
    const match = scanner.findProjectByRepo(completed.repo);
    const projectName = match ? match.projectName : completed.repo;

    // Detect PR created by the agent
    let prUrl = null;
    try {
      const { execSync } = require('child_process');
      const prJson = execSync(
        `gh pr list --repo ${completed.repo} --head ${completed.branch} --json url -q '.[0].url'`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();
      if (prJson) prUrl = prJson;
    } catch { /* no PR found */ }

    const cell = await guiPost('/api/cells', {
      feature: completed.title,
      project: projectName,
      branch: completed.branch,
      githubIssueUrl: issueUrl,
    });

    if (cell && cell.id) {
      // Move cell status to awaiting-review
      await guiPatch(`/api/cells/${cell.id}/status`, { status: 'awaiting-review', note: 'Completed by scheduler' });

      // Attach PR URL if found
      if (prUrl) {
        await guiPatch(`/api/cells/${cell.id}`, { githubPrUrl: prUrl });
        log(`  PR: ${prUrl}`);
      }

      // Add to merge queue
      const mqResult = await guiPost('/api/merge-queue', { cell_id: cell.id });
      if (mqResult && mqResult.id) {
        log(`  Added to merge queue (cell ${cell.id}, position ${mqResult.position})`);
      } else {
        log(`  Created cell ${cell.id} but failed to add to merge queue`);
      }
    } else {
      log(`  Failed to create cell record in GUI DB`);
    }
  }

  saveState();

  // Try to fill the now-open slot
  fillSlots();
}

/**
 * Start the scheduler daemon.
 */
function start() {
  // Write PID file
  if (!fs.existsSync(queue.SCHEDULER_DIR)) {
    fs.mkdirSync(queue.SCHEDULER_DIR, { recursive: true });
  }
  fs.writeFileSync(PID_PATH, String(process.pid));

  // Kill any existing process on the API port
  try {
    const { execSync } = require('child_process');
    execSync(`lsof -ti :${API_PORT} | xargs kill -9 2>/dev/null`, { stdio: 'pipe' });
  } catch { /* nothing on the port */ }

  log(`Scheduler starting (PID ${process.pid})`);
  log(`API server on port ${API_PORT}`);
  log(`Poll interval: ${POLL_INTERVAL / 1000}s`);
  log(`Max concurrent sessions: ${sessions.MAX_SESSIONS}`);

  // Set up session completion handler
  sessions.setOnComplete(handleSessionComplete);

  // Set up API server
  api.setSchedulerState(state);
  const server = api.createServer(API_PORT);
  server.listen(API_PORT, () => {
    log(`API listening on http://localhost:${API_PORT}`);
  });

  // Wire up trigger for on-demand scans
  state.triggerScan = () => {
    scanAndEnqueue();
    fillSlots();
  };

  // Initial scan
  scanAndEnqueue();
  fillSlots();

  // Poll loop
  const interval = setInterval(() => {
    scanAndEnqueue();
    fillSlots();
  }, POLL_INTERVAL);

  // Graceful shutdown
  function shutdown(signal) {
    log(`Received ${signal}, shutting down...`);
    state.status = 'stopping';
    saveState();
    clearInterval(interval);
    sessions.killAll();
    server.close();
    try { fs.unlinkSync(PID_PATH); } catch { /* ignore */ }
    log('Scheduler stopped');
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

/**
 * Check if the scheduler is already running by reading the PID file.
 */
function isRunning() {
  if (!fs.existsSync(PID_PATH)) return false;
  const pid = parseInt(fs.readFileSync(PID_PATH, 'utf8').trim(), 10);
  try {
    process.kill(pid, 0); // signal 0 = check if process exists
    return pid;
  } catch {
    // Stale PID file
    try { fs.unlinkSync(PID_PATH); } catch { /* ignore */ }
    return false;
  }
}

/**
 * Read saved state from disk (for status command when daemon is not running).
 */
function readSavedState() {
  if (!fs.existsSync(STATE_PATH)) return null;
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

module.exports = { start, isRunning, readSavedState, API_PORT };
