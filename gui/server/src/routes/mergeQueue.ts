import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/merge-queue
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT mq.*, c.feature, c.project, c.branch, c.status, c.github_pr_url
       FROM merge_queue mq
       JOIN cells c ON c.id = mq.cell_id
       ORDER BY mq.position ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/merge-queue — add cell to queue
router.post('/', async (req, res) => {
  try {
    const { cell_id, depends_on } = req.body;
    if (!cell_id) {
      return res.status(400).json({ error: 'cell_id is required' });
    }

    // Get max position
    const { rows: maxRows } = await pool.query('SELECT COALESCE(MAX(position), 0) + 1 as next FROM merge_queue');
    const position = maxRows[0].next;

    const { rows } = await pool.query(
      `INSERT INTO merge_queue (cell_id, position, depends_on) VALUES ($1, $2, $3) RETURNING *`,
      [cell_id, position, depends_on || null]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /api/merge-queue/reorder — reorder the queue
router.patch('/reorder', async (req, res) => {
  try {
    const { order } = req.body; // array of { id, position }
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'order must be an array of { id, position }' });
    }

    for (const item of order) {
      await pool.query('UPDATE merge_queue SET position = $1 WHERE id = $2', [item.position, item.id]);
    }

    const { rows } = await pool.query(
      `SELECT mq.*, c.feature, c.project, c.branch, c.status, c.github_pr_url
       FROM merge_queue mq
       JOIN cells c ON c.id = mq.cell_id
       ORDER BY mq.position ASC`
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/merge-queue/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM merge_queue WHERE id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Queue entry not found' });
    }
    res.json({ deleted: rows[0] });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
