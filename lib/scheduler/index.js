'use strict';

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const scanner = require('./scanner');
const queue = require('./queue');
const sessions = require('./sessions');
const setup = require('./setup');
const api = require('./api');

const POLL_INTERVAL = 5 * 60 * 1000;
const API_PORT = parseInt(process.env.SCHEDULER_PORT || '3401', 10);
const STATE_PATH = path.join(queue.SCHEDULER_DIR, 'state.json');
const PID_PATH = path.join(queue.SCHEDULER_DIR, 'scheduler.pid');
const LOG_PATH = path.join(queue.SCHEDULER_DIR, 'scheduler.log');

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function logError(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.error(`[${ts}] ERROR: ${msg}`);
}

function ensureSchedulerDir() {
  if (!fs.existsSync(queue.SCHEDULER_DIR)) {
    fs.mkdirSync(queue.SCHEDULER_DIR, { recursive: true });
  }
}

function writePid(pid) {
  ensureSchedulerDir();
  fs.writeFileSync(PID_PATH, String(pid));
}

function removePidIfCurrent(pid) {
  try {
    const saved = fs.readFileSync(PID_PATH, 'utf8').trim();
    if (saved === String(pid)) {
      fs.unlinkSync(PID_PATH);
    }
  } catch { /* ignore */ }
}

function findListeningPid() {
  try {
    const output = execSync(`lsof -tiTCP:${API_PORT} -sTCP:LISTEN`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (!output) return false;

    const pid = parseInt(output.split('\n')[0], 10);
    return Number.isNaN(pid) ? false : pid;
  } catch {
    return false;
  }
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
    ensureSchedulerDir();
    fs.writeFileSync(STATE_PATH, JSON.stringify({
      status: state.status,
      paused: state.paused,
      startedAt: state.startedAt,
      lastScanAt: state.lastScanAt,
      activeSessions: sessions.list(),
      queue: queue.list(),
      completed: state.completed.slice(-50),
    }, null, 2) + '\n');
  } catch { /* best effort */ }
}

function scanAndEnqueue() {
  log('Scanning for dispatch-ready issues...');
  state.lastScanAt = new Date().toISOString();

  try {
    const issues = scanner.scan();
    const staleActiveIssues = scanner.scanActive().filter((issue) => {
      if (sessions.isActive(issue.issueRef)) return false;
      if (queue.has(issue.issueRef)) return false;
      if (state.completed.some((completed) => completed.issueRef === issue.issueRef)) return false;
      return true;
    });

    let added = 0;
    for (const issue of issues) {
      if (queue.has(issue.issueRef) || sessions.isActive(issue.issueRef)) continue;
      if (state.completed.some((c) => c.issueRef === issue.issueRef)) continue;

      if (queue.add(issue)) {
        log(`  Queued: ${issue.issueRef} — ${issue.title}`);
        added++;
      }
    }

    for (const issue of staleActiveIssues) {
      setup.setLabel(issue.repo, issue.number, 'cell:queued');
      if (queue.add(issue)) {
        log(`  Re-queued stale active issue: ${issue.issueRef} — ${issue.title}`);
        added++;
      }
    }

    if (added === 0 && issues.length === 0 && staleActiveIssues.length === 0) {
      log('  No dispatch-ready issues found');
    } else if (added === 0) {
      log(`  ${issues.length + staleActiveIssues.length} issue(s) found, all already tracked`);
    } else {
      log(`  Added ${added} new issue(s) to queue`);
    }
  } catch (err) {
    logError(`Scan failed: ${err.message}`);
  }

  saveState();
}

function fillSlots() {
  if (state.paused) return;

  while (sessions.hasCapacity() && queue.size() > 0) {
    const issue = queue.next();
    if (!issue) break;

    log(`Starting session: ${issue.issueRef} — ${issue.title}`);

    try {
      const { localPath, branch, prompt } = setup.setupCell(issue);
      setup.setLabel(issue.repo, issue.number, 'cell:active');

      const session = sessions.start(issue, localPath, branch, prompt);
      if (!session) {
        logError('  Failed to start session (at capacity)');
        queue.add(issue);
        break;
      }

      log(`  PID ${session.pid} — branch ${branch}`);
    } catch (err) {
      logError(`  Setup failed for ${issue.issueRef}: ${err.message}`);
      setup.setLabel(issue.repo, issue.number, 'cell:blocked');
    }

    saveState();
  }
}

function guiRequest(method, requestPath, body) {
  return new Promise((resolve) => {
    const http = require('http');
    const data = JSON.stringify(body);
    const req = http.request(`http://localhost:3400${requestPath}`, {
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

function guiPost(requestPath, body) { return guiRequest('POST', requestPath, body); }
function guiPatch(requestPath, body) { return guiRequest('PATCH', requestPath, body); }

async function handleSessionComplete(completed) {
  log(`Session completed: ${completed.issueRef} (exit code ${completed.exitCode})`);

  setup.setLabel(completed.repo, completed.number, 'cell:awaiting-review');
  state.completed.push(completed);

  if (completed.exitCode === 0) {
    const issueUrl = `https://github.com/${completed.repo}/issues/${completed.number}`;
    const match = scanner.findProjectByRepo(completed.repo);
    const projectName = match ? match.projectName : completed.repo;

    let prUrl = null;
    try {
      prUrl = execSync(
        `gh pr list --repo ${completed.repo} --head ${completed.branch} --json url -q '.[0].url'`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim() || null;
    } catch { /* no PR found */ }

    const cell = await guiPost('/api/cells', {
      feature: completed.title,
      project: projectName,
      branch: completed.branch,
      githubIssueUrl: issueUrl,
    });

    if (cell && cell.id) {
      await guiPatch(`/api/cells/${cell.id}/status`, { status: 'awaiting-review', note: 'Completed by scheduler' });

      if (prUrl) {
        await guiPatch(`/api/cells/${cell.id}`, { githubPrUrl: prUrl });
        log(`  PR: ${prUrl}`);
      }

      const mqResult = await guiPost('/api/merge-queue', { cell_id: cell.id });
      if (mqResult && mqResult.id) {
        log(`  Added to merge queue (cell ${cell.id}, position ${mqResult.position})`);
      } else {
        log(`  Created cell ${cell.id} but failed to add to merge queue`);
      }
    } else {
      log('  Failed to create cell record in GUI DB');
    }
  }

  saveState();
  fillSlots();
}

function start() {
  log(`Scheduler starting (PID ${process.pid})`);
  log(`API server on port ${API_PORT}`);
  log(`Poll interval: ${POLL_INTERVAL / 1000}s`);
  log(`Max concurrent sessions: ${sessions.MAX_SESSIONS}`);

  sessions.setOnComplete(handleSessionComplete);

  api.setSchedulerState(state);
  const server = api.createServer(API_PORT);
  server.on('error', (err) => {
    logError(`API listen failed on port ${API_PORT}: ${err.message}`);
    removePidIfCurrent(process.pid);
    process.exit(1);
  });
  server.listen(API_PORT, () => {
    writePid(process.pid);
    log(`API listening on http://localhost:${API_PORT}`);
  });

  state.triggerScan = () => {
    scanAndEnqueue();
    fillSlots();
  };

  scanAndEnqueue();
  fillSlots();

  const interval = setInterval(() => {
    scanAndEnqueue();
    fillSlots();
  }, POLL_INTERVAL);

  function shutdown(signal) {
    log(`Received ${signal}, shutting down...`);
    state.status = 'stopping';
    saveState();
    clearInterval(interval);
    sessions.killAll();
    server.close();
    removePidIfCurrent(process.pid);
    log('Scheduler stopped');
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

function startDaemon() {
  const running = isRunning();
  if (running) {
    return { alreadyRunning: true, pid: running, logPath: LOG_PATH };
  }

  ensureSchedulerDir();

  const scriptPath = path.resolve(__dirname, '..', '..', 'bin', 'auto-shop');
  const stdoutFd = fs.openSync(LOG_PATH, 'a');
  const stderrFd = fs.openSync(LOG_PATH, 'a');
  const child = spawn(process.execPath, [scriptPath, 'dispatch', 'start', '--foreground'], {
    cwd: path.resolve(__dirname, '..', '..'),
    detached: true,
    stdio: ['ignore', stdoutFd, stderrFd],
    env: process.env,
  });

  child.unref();

  return { alreadyRunning: false, pid: child.pid, logPath: LOG_PATH };
}

function isRunning() {
  if (fs.existsSync(PID_PATH)) {
    const pid = parseInt(fs.readFileSync(PID_PATH, 'utf8').trim(), 10);
    try {
      process.kill(pid, 0);
      return pid;
    } catch {
      try { fs.unlinkSync(PID_PATH); } catch { /* ignore */ }
    }
  }

  const portPid = findListeningPid();
  if (portPid) {
    writePid(portPid);
    return portPid;
  }

  return false;
}

function readSavedState() {
  if (!fs.existsSync(STATE_PATH)) return null;
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

module.exports = { start, startDaemon, isRunning, readSavedState, API_PORT, LOG_PATH };
