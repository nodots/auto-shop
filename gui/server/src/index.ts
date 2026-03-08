import express from 'express';
import cors from 'cors';
import path from 'path';
import { checkConnection } from './db.js';
import projectsRouter from './routes/projects.js';
import cellsRouter from './routes/cells.js';
import dashboardRouter from './routes/dashboard.js';
import mergeQueueRouter from './routes/mergeQueue.js';
import gitRouter from './routes/git.js';
import schedulerRouter from './routes/scheduler.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3400', 10);

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/projects', projectsRouter);
app.use('/api/cells', cellsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/merge-queue', mergeQueueRouter);
app.use('/api/git', gitRouter);
app.use('/api/scheduler', schedulerRouter);

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

async function start() {
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
