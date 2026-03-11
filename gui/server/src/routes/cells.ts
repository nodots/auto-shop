import { Router } from 'express';
import { eq, desc, and } from 'drizzle-orm';
import { db } from '../db.js';
import { cells, cellStatusHistory } from '../db/schema.js';

const router = Router();

// GET /api/cells — list all cells, optionally filtered by status or project
router.get('/', async (req, res) => {
  try {
    const { status, project } = req.query;
    const conditions = [];

    if (status) conditions.push(eq(cells.status, status as typeof cells.status.enumValues[number]));
    if (project) conditions.push(eq(cells.project, project as string));

    const rows = await db
      .select()
      .from(cells)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(cells.updatedAt));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/cells/:id — get single cell with status history
router.get('/:id', async (req, res) => {
  try {
    const cell = await db.query.cells.findFirst({
      where: eq(cells.id, parseInt(req.params.id)),
    });

    if (!cell) {
      return res.status(404).json({ error: 'Cell not found' });
    }

    const history = await db
      .select()
      .from(cellStatusHistory)
      .where(eq(cellStatusHistory.cellId, cell.id))
      .orderBy(desc(cellStatusHistory.changedAt));

    res.json({ ...cell, history });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/cells — create a new cell
router.post('/', async (req, res) => {
  try {
    const { feature, project, branch, scope, githubIssueUrl } = req.body;
    if (!feature || !project || !branch) {
      return res.status(400).json({ error: 'feature, project, and branch are required' });
    }

    const [cell] = await db
      .insert(cells)
      .values({
        feature,
        project,
        branch,
        status: 'queued',
        scope: scope || null,
        githubIssueUrl: githubIssueUrl || null,
      })
      .returning();

    await db.insert(cellStatusHistory).values({
      cellId: cell.id,
      fromStatus: null,
      toStatus: 'queued',
      note: 'Cell created',
    });

    res.status(201).json(cell);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /api/cells/:id/status — transition cell status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['queued', 'active', 'blocked', 'awaiting-review', 'merged'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const current = await db.query.cells.findFirst({
      where: eq(cells.id, parseInt(req.params.id)),
    });

    if (!current) {
      return res.status(404).json({ error: 'Cell not found' });
    }

    const [updated] = await db
      .update(cells)
      .set({ status, updatedAt: new Date() })
      .where(eq(cells.id, parseInt(req.params.id)))
      .returning();

    await db.insert(cellStatusHistory).values({
      cellId: parseInt(req.params.id),
      fromStatus: current.status,
      toStatus: status,
      note: note || null,
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /api/cells/:id — update cell fields
router.patch('/:id', async (req, res) => {
  try {
    const { scope, blocker, handoff, githubIssueUrl, githubPrUrl } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (scope !== undefined) updates.scope = scope;
    if (blocker !== undefined) updates.blocker = blocker;
    if (handoff !== undefined) updates.handoff = handoff;
    if (githubIssueUrl !== undefined) updates.githubIssueUrl = githubIssueUrl;
    if (githubPrUrl !== undefined) updates.githubPrUrl = githubPrUrl;

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const [updated] = await db
      .update(cells)
      .set(updates)
      .where(eq(cells.id, parseInt(req.params.id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Cell not found' });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/cells/:id — delete a cell
router.delete('/:id', async (req, res) => {
  try {
    const [deleted] = await db
      .delete(cells)
      .where(eq(cells.id, parseInt(req.params.id)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Cell not found' });
    }

    res.json({ deleted });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
