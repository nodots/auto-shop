import { Router } from 'express';
import http from 'http';

const router = Router();

const SCHEDULER_PORT = parseInt(process.env.SCHEDULER_PORT || '3401', 10);
const SCHEDULER_BASE = `http://localhost:${SCHEDULER_PORT}`;

function proxyToScheduler(schedulerPath: string, method: string, res: any) {
  const req = http.request(`${SCHEDULER_BASE}${schedulerPath}`, { method }, (proxyRes) => {
    let data = '';
    proxyRes.on('data', (chunk: string) => { data += chunk; });
    proxyRes.on('end', () => {
      try {
        res.status(proxyRes.statusCode || 200).json(JSON.parse(data));
      } catch {
        res.status(proxyRes.statusCode || 200).send(data);
      }
    });
  });

  req.on('error', () => {
    res.status(503).json({ error: 'Dispatch board is not running' });
  });

  req.end();
}

// GET /api/dispatch/status
router.get('/status', (_req, res) => {
  proxyToScheduler('/api/scheduler/status', 'GET', res);
});

// POST /api/dispatch/pause
router.post('/pause', (_req, res) => {
  proxyToScheduler('/api/scheduler/pause', 'POST', res);
});

// POST /api/dispatch/resume
router.post('/resume', (_req, res) => {
  proxyToScheduler('/api/scheduler/resume', 'POST', res);
});

// POST /api/dispatch/scan
router.post('/scan', (_req, res) => {
  proxyToScheduler('/api/scheduler/scan', 'POST', res);
});

// POST /api/dispatch/stop
router.post('/stop', (_req, res) => {
  proxyToScheduler('/api/scheduler/stop', 'POST', res);
});

// DELETE /api/dispatch/queue/:issueRef
router.delete('/queue/:issueRef', (req, res) => {
  const encoded = encodeURIComponent(req.params.issueRef);
  proxyToScheduler(`/api/scheduler/queue/${encoded}`, 'DELETE', res);
});

// POST /api/dispatch/kill/:issueRef
router.post('/kill/:issueRef', (req, res) => {
  const encoded = encodeURIComponent(req.params.issueRef);
  proxyToScheduler(`/api/scheduler/kill/${encoded}`, 'POST', res);
});

// GET /api/dispatch/logs/:issueRef
router.get('/logs/:issueRef', (req, res) => {
  const encoded = encodeURIComponent(req.params.issueRef);
  proxyToScheduler(`/api/scheduler/logs/${encoded}`, 'GET', res);
});

export default router;
