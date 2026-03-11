'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { SCHEDULER_DIR } = require('./queue');

const MAX_SESSIONS = parseInt(process.env.MAX_SESSIONS || '4', 10);
const LOGS_DIR = path.join(SCHEDULER_DIR, 'logs');
const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

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

function claudeProjectSlug(localPath) {
  return path.resolve(localPath).replace(/[\\/.]/g, '-');
}

function claudeProjectDir(localPath) {
  return path.join(CLAUDE_PROJECTS_DIR, claudeProjectSlug(localPath));
}

function readLatestClaudeActivity(localPath) {
  const projectDir = claudeProjectDir(localPath);
  if (!fs.existsSync(projectDir)) {
    return null;
  }

  const sessionFiles = fs
    .readdirSync(projectDir)
    .filter((name) => name.endsWith('.jsonl') && !name.endsWith('.jsonl.wakatime'))
    .map((name) => ({
      name,
      fullPath: path.join(projectDir, name),
      stat: fs.statSync(path.join(projectDir, name)),
    }))
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

  const latestFile = sessionFiles[0];
  if (!latestFile) {
    return null;
  }

  let lines;
  try {
    lines = fs.readFileSync(latestFile.fullPath, 'utf8').trim().split('\n').filter(Boolean);
  } catch {
    return null;
  }

  const latestEntry = findLatestActivityEntry(lines);

  return {
    claudeProjectPath: projectDir,
    claudeSessionId: path.basename(latestFile.name, '.jsonl'),
    lastActivityAt: latestEntry?.timestamp || new Date(latestFile.stat.mtimeMs).toISOString(),
    latestActivitySummary: latestEntry?.summary || null,
    latestActivityType: latestEntry?.type || null,
  };
}

function findLatestActivityEntry(lines) {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      const entry = JSON.parse(lines[index]);
      const summary = summarizeClaudeEntry(entry);
      if (!summary) continue;

      return {
        summary,
        timestamp: entry.timestamp || null,
        type: entry.type || null,
      };
    } catch {
      // Ignore malformed lines from partial writes.
    }
  }

  return null;
}

function summarizeClaudeEntry(entry) {
  if (entry.type === 'assistant' && entry.message?.content) {
    const summary = summarizeMessageContent(entry.message.content);
    if (summary) {
      return summary;
    }
  }

  if (entry.type === 'progress' && entry.data?.hookEvent) {
    const hookName = entry.data.hookName || entry.data.hookEvent;
    return `Hook: ${hookName}`;
  }

  if (entry.type === 'user' && Array.isArray(entry.message?.content)) {
    const toolResult = entry.message.content.find((item) => item?.type === 'tool_result');
    if (toolResult?.tool_use_id) {
      return 'Tool result received';
    }
  }

  return null;
}

function summarizeMessageContent(content) {
  for (const item of content) {
    if (item?.type === 'text' && item.text?.trim()) {
      return truncate(item.text.trim(), 220);
    }

    if (item?.type === 'tool_use') {
      const detail = item.input?.description || item.input?.command || item.name;
      return truncate(`${item.name}: ${detail}`, 220);
    }
  }

  return null;
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
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
  return [...active.values()].map((session) => {
    const claudeActivity = readLatestClaudeActivity(session.localPath);
    return {
      issueRef: session.issueRef,
      repo: session.repo,
      number: session.number,
      title: session.title,
      branch: session.branch,
      pid: session.pid,
      logFile: session.logFile,
      startedAt: session.startedAt,
      localPath: session.localPath,
      claudeSessionId: claudeActivity?.claudeSessionId || null,
      claudeProjectPath: claudeActivity?.claudeProjectPath || null,
      lastActivityAt: claudeActivity?.lastActivityAt || null,
      latestActivitySummary: claudeActivity?.latestActivitySummary || null,
      latestActivityType: claudeActivity?.latestActivityType || null,
    };
  });
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
