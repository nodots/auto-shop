import express from 'express';
import cors from 'cors';
import path from 'path';
import { createRequire } from 'module';
import { checkConnection } from './db.js';
import accountsRouter from './routes/accounts.js';
import baysRouter from './routes/bays.js';
import shopFloorRouter from './routes/shopFloor.js';
import releaseLaneRouter from './routes/releaseLane.js';
import gitRouter from './routes/git.js';
import dispatchBoardRouter from './routes/dispatchBoard.js';
import repairOrdersRouter from './routes/repairOrders.js';
import workflowRouter from './routes/workflow.js';

const require = createRequire(import.meta.url);
const scheduler = require('../../../lib/scheduler/index.js');
const app = express();
const PORT = parseInt(process.env.PORT || '3400', 10);

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/accounts', accountsRouter);
app.use('/api/projects', accountsRouter);
app.use('/api/bays', baysRouter);
app.use('/api/cells', baysRouter);
app.use('/api/shop-floor', shopFloorRouter);
app.use('/api/dashboard', shopFloorRouter);
app.use('/api/release-lane', releaseLaneRouter);
app.use('/api/merge-queue', releaseLaneRouter);
app.use('/api/git', gitRouter);
app.use('/api/dispatch', dispatchBoardRouter);
app.use('/api/scheduler', dispatchBoardRouter);
app.use('/api/repair-orders', repairOrdersRouter);
app.use('/api/issues', repairOrdersRouter);
app.use('/api/workflow', workflowRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// In production, serve the built client
const clientDist = path.resolve(import.meta.dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

function ensureDispatchBoardRunning() {
  const running = scheduler.isRunning();
  if (running) {
    console.log(`Dispatch board already running on http://localhost:${scheduler.API_PORT} (PID ${running})`);
    return;
  }

  try {
    const launched = scheduler.startDaemon();
    if (launched.alreadyRunning) {
      console.log(`Dispatch board already running on http://localhost:${scheduler.API_PORT} (PID ${launched.pid})`);
      return;
    }

    console.log(`Dispatch board starting in background on http://localhost:${scheduler.API_PORT} (PID ${launched.pid})`);
    console.log(`Dispatch board logs: ${launched.logPath}`);
  } catch (err) {
    console.warn('Failed to start dispatch board automatically:', (err as Error).message);
  }
}

async function start() {
  ensureDispatchBoardRunning();

  try {
    await checkConnection();
    console.log('Database connected');
  } catch (err) {
    // Graceful degradation: server starts but DB-dependent routes will fail
    console.warn('Database not available, running without persistence:', (err as Error).message);
    console.warn('Set DATABASE_URL to enable database features');
  }

  app.listen(PORT, () => {
    console.log(`auto-shop API server running on http://localhost:${PORT}`);
  });
}

start();
