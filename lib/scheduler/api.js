'use strict';

const http = require('http');
const queue = require('./queue');
const sessions = require('./sessions');

let schedulerState = null;

function setSchedulerState(state) {
  schedulerState = state;
}

function jsonResponse(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

function createServer(port) {
  const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    const url = new URL(req.url, `http://localhost:${port}`);
    const pathname = url.pathname;

    // GET /api/scheduler/status
    if (pathname === '/api/scheduler/status' && req.method === 'GET') {
      return jsonResponse(res, 200, {
        status: schedulerState ? schedulerState.status : 'unknown',
        startedAt: schedulerState ? schedulerState.startedAt : null,
        lastScanAt: schedulerState ? schedulerState.lastScanAt : null,
        paused: schedulerState ? schedulerState.paused : false,
        activeSessions: sessions.list(),
        activeCount: sessions.activeCount(),
        maxSessions: sessions.MAX_SESSIONS,
        queue: queue.list(),
        queueSize: queue.size(),
        completed: schedulerState ? schedulerState.completed : [],
      });
    }

    // POST /api/scheduler/pause
    if (pathname === '/api/scheduler/pause' && req.method === 'POST') {
      if (schedulerState) schedulerState.paused = true;
      return jsonResponse(res, 200, { paused: true });
    }

    // POST /api/scheduler/resume
    if (pathname === '/api/scheduler/resume' && req.method === 'POST') {
      if (schedulerState) schedulerState.paused = false;
      return jsonResponse(res, 200, { paused: false });
    }

    // POST /api/scheduler/scan — trigger immediate scan
    if (pathname === '/api/scheduler/scan' && req.method === 'POST') {
      if (schedulerState && schedulerState.triggerScan) {
        schedulerState.triggerScan();
      }
      return jsonResponse(res, 200, { triggered: true });
    }

    // POST /api/scheduler/stop — graceful shutdown
    if (pathname === '/api/scheduler/stop' && req.method === 'POST') {
      if (schedulerState) schedulerState.status = 'stopping';
      sessions.killAll();
      jsonResponse(res, 200, { status: 'stopping' });
      setTimeout(() => process.exit(0), 1000);
      return;
    }

    // DELETE /api/scheduler/queue/:issueRef — remove from queue
    // issueRef is URL-encoded, e.g., /api/scheduler/queue/owner%2Frepo%23123
    if (pathname.startsWith('/api/scheduler/queue/') && req.method === 'DELETE') {
      const issueRef = decodeURIComponent(pathname.slice('/api/scheduler/queue/'.length));
      const removed = queue.remove(issueRef);
      return jsonResponse(res, removed ? 200 : 404, { removed, issueRef });
    }

    // POST /api/scheduler/kill/:issueRef — kill an active session
    if (pathname.startsWith('/api/scheduler/kill/') && req.method === 'POST') {
      const issueRef = decodeURIComponent(pathname.slice('/api/scheduler/kill/'.length));
      const killed = sessions.kill(issueRef);
      return jsonResponse(res, killed ? 200 : 404, { killed, issueRef });
    }

    // GET /api/scheduler/logs/:issueRef — tail log for a session
    if (pathname.startsWith('/api/scheduler/logs/') && req.method === 'GET') {
      const issueRef = decodeURIComponent(pathname.slice('/api/scheduler/logs/'.length));
      const allSessions = [...sessions.list(), ...(schedulerState ? schedulerState.completed : [])];
      const session = allSessions.find(s => s.issueRef === issueRef);
      if (!session || !session.logFile) {
        return jsonResponse(res, 404, { error: 'Log not found' });
      }
      try {
        const fs = require('fs');
        const lines = url.searchParams.get('lines') || '100';
        const { execSync } = require('child_process');
        const tail = execSync(`tail -n ${parseInt(lines)} "${session.logFile}"`, { encoding: 'utf8' });
        return jsonResponse(res, 200, { issueRef, log: tail });
      } catch {
        return jsonResponse(res, 404, { error: 'Log file not readable' });
      }
    }

    jsonResponse(res, 404, { error: 'Not found' });
  });

  return server;
}

module.exports = { createServer, setSchedulerState };
