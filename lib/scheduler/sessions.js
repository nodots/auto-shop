'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { SCHEDULER_DIR } = require('./queue');

const MAX_SESSIONS = parseInt(process.env.MAX_SESSIONS || '4', 10);
const LOGS_DIR = path.join(SCHEDULER_DIR, 'logs');

// Active sessions: Map<issueRef, sessionInfo>
const active = new Map();

// Callback for when a session completes
let onComplete = null;

function setOnComplete(fn) {
  onComplete = fn;
}

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

/**
 * Start a new claude --remote session.
 * Returns the session info or null if at capacity.
 */
function start(issue, localPath, branch, prompt) {
  if (active.size >= MAX_SESSIONS) return null;

  ensureLogsDir();

  const logFile = path.join(LOGS_DIR, `${issue.repo.replace('/', '-')}-${issue.number}.log`);
  const logFd = fs.openSync(logFile, 'a');

  // Strip CLAUDECODE env var so claude --remote doesn't think it's nested
  const env = { ...process.env };
  delete env.CLAUDECODE;

  // Pass prompt directly; use auto permission mode so the agent can work autonomously
  const child = spawn('claude', ['--remote', '--permission-mode', 'auto', '-p', prompt], {
    cwd: localPath,
    stdio: ['ignore', logFd, logFd],
    detached: false,
    env,
  });

  const session = {
    issueRef: issue.issueRef,
    repo: issue.repo,
    number: issue.number,
    title: issue.title,
    branch,
    localPath,
    pid: child.pid,
    logFile,
    startedAt: new Date().toISOString(),
    child,
  };

  active.set(issue.issueRef, session);

  child.on('close', (code) => {
    fs.closeSync(logFd);

    const completed = {
      issueRef: session.issueRef,
      repo: session.repo,
      number: session.number,
      title: session.title,
      branch: session.branch,
      startedAt: session.startedAt,
      completedAt: new Date().toISOString(),
      exitCode: code,
      logFile: session.logFile,
    };

    active.delete(issue.issueRef);

    if (onComplete) {
      onComplete(completed);
    }
  });

  return session;
}

/**
 * List active sessions (without child process handles).
 */
function list() {
  return [...active.values()].map(s => ({
    issueRef: s.issueRef,
    repo: s.repo,
    number: s.number,
    title: s.title,
    branch: s.branch,
    pid: s.pid,
    logFile: s.logFile,
    startedAt: s.startedAt,
  }));
}

function activeCount() {
  return active.size;
}

function hasCapacity() {
  return active.size < MAX_SESSIONS;
}

/**
 * Check if an issue is currently being worked on.
 */
function isActive(issueRef) {
  return active.has(issueRef);
}

/**
 * Kill a specific session by issueRef.
 */
function kill(issueRef) {
  const session = active.get(issueRef);
  if (!session) return false;
  try {
    session.child.kill('SIGTERM');
  } catch { /* ignore */ }
  return true;
}

/**
 * Kill all active sessions.
 */
function killAll() {
  for (const session of active.values()) {
    try { session.child.kill('SIGTERM'); } catch { /* ignore */ }
  }
}

module.exports = { start, list, activeCount, hasCapacity, isActive, kill, killAll, setOnComplete, MAX_SESSIONS };
