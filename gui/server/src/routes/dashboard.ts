import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/dashboard — aggregate dashboard data
router.get('/', async (_req, res) => {
  try {
    // Cell counts by status
    const { rows: statusCounts } = await pool.query(
      `SELECT status, COUNT(*)::int as count FROM cells GROUP BY status`
    );

    const counts: Record<string, number> = {
      queued: 0, active: 0, blocked: 0, 'awaiting-review': 0, merged: 0,
    };
    for (const row of statusCounts) {
      counts[row.status] = row.count;
    }

    // Blocked cells
    const { rows: blockedCells } = await pool.query(
      `SELECT id, feature, project, branch, blocker, updated_at
       FROM cells WHERE status = 'blocked' ORDER BY updated_at DESC`
    );

    // Awaiting review cells (ready PRs)
    const { rows: readyPRs } = await pool.query(
      `SELECT id, feature, project, branch, github_pr_url, updated_at
       FROM cells WHERE status = 'awaiting-review' ORDER BY updated_at DESC`
    );

    // Recent activity
    const { rows: recentActivity } = await pool.query(
      `SELECT h.*, c.feature, c.project
       FROM cell_status_history h
       JOIN cells c ON c.id = h.cell_id
       ORDER BY h.changed_at DESC LIMIT 20`
    );

    res.json({
      capacity: { active: counts.active, max: 4 },
      counts,
      blockedCells,
      readyPRs,
      recentActivity,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
