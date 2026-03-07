import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/cells — list all cells, optionally filtered by status or project
router.get('/', async (req, res) => {
  try {
    const { status, project } = req.query;
    let query = 'SELECT * FROM cells';
    const params: string[] = [];
    const conditions: string[] = [];

    if (status) {
      params.push(status as string);
      conditions.push(`status = $${params.length}`);
    }
    if (project) {
      params.push(project as string);
      conditions.push(`project = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY updated_at DESC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/cells/:id — get single cell with history
router.get('/:id', async (req, res) => {
  try {
    const { rows: cells } = await pool.query('SELECT * FROM cells WHERE id = $1', [req.params.id]);
    if (cells.length === 0) {
      return res.status(404).json({ error: 'Cell not found' });
    }

    const { rows: history } = await pool.query(
      'SELECT * FROM cell_status_history WHERE cell_id = $1 ORDER BY changed_at DESC',
      [req.params.id]
    );

    res.json({ ...cells[0], history });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/cells — create a new cell
router.post('/', async (req, res) => {
  try {
    const { feature, project, branch, scope, github_issue_url } = req.body;
    if (!feature || !project || !branch) {
      return res.status(400).json({ error: 'feature, project, and branch are required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO cells (feature, project, branch, status, scope, github_issue_url)
       VALUES ($1, $2, $3, 'queued', $4, $5)
       RETURNING *`,
      [feature, project, branch, scope || null, github_issue_url || null]
    );

    await pool.query(
      `INSERT INTO cell_status_history (cell_id, from_status, to_status, note)
       VALUES ($1, NULL, 'queued', 'Cell created')`,
      [rows[0].id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /api/cells/:id/status — transition status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['queued', 'active', 'blocked', 'awaiting-review', 'merged'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const { rows: current } = await pool.query('SELECT status FROM cells WHERE id = $1', [req.params.id]);
    if (current.length === 0) {
      return res.status(404).json({ error: 'Cell not found' });
    }

    const { rows } = await pool.query(
      `UPDATE cells SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );

    await pool.query(
      `INSERT INTO cell_status_history (cell_id, from_status, to_status, note)
       VALUES ($1, $2, $3, $4)`,
      [req.params.id, current[0].status, status, note || null]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /api/cells/:id — update cell fields
router.patch('/:id', async (req, res) => {
  try {
    const { scope, blocker, handoff, github_issue_url, github_pr_url } = req.body;
    const updates: string[] = [];
    const params: any[] = [];

    if (scope !== undefined) {
      params.push(JSON.stringify(scope));
      updates.push(`scope = $${params.length}`);
    }
    if (blocker !== undefined) {
      params.push(blocker);
      updates.push(`blocker = $${params.length}`);
    }
    if (handoff !== undefined) {
      params.push(handoff);
      updates.push(`handoff = $${params.length}`);
    }
    if (github_issue_url !== undefined) {
      params.push(github_issue_url);
      updates.push(`github_issue_url = $${params.length}`);
    }
    if (github_pr_url !== undefined) {
      params.push(github_pr_url);
      updates.push(`github_pr_url = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    const { rows } = await pool.query(
      `UPDATE cells SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cell not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/cells/:id — delete (teardown) a cell
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM cells WHERE id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cell not found' });
    }
    res.json({ deleted: rows[0] });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
