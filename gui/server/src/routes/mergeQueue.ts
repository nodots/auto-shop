import { Router } from 'express';
import { eq, asc, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { cells, mergeQueue } from '../db/schema.js';

const router = Router();

// GET /api/merge-queue
router.get('/', async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: mergeQueue.id,
        cellId: mergeQueue.cellId,
        position: mergeQueue.position,
        dependsOn: mergeQueue.dependsOn,
        addedAt: mergeQueue.addedAt,
        feature: cells.feature,
        project: cells.project,
        branch: cells.branch,
        status: cells.status,
        githubPrUrl: cells.githubPrUrl,
      })
      .from(mergeQueue)
      .innerJoin(cells, eq(cells.id, mergeQueue.cellId))
      .orderBy(asc(mergeQueue.position));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/merge-queue — add cell to merge queue
router.post('/', async (req, res) => {
  try {
    const { cell_id, depends_on } = req.body;
    if (!cell_id) {
      return res.status(400).json({ error: 'cell_id is required' });
    }

    const [{ next }] = await db
      .select({ next: sql<number>`coalesce(max(${mergeQueue.position}), 0) + 1` })
      .from(mergeQueue);

    const [row] = await db
      .insert(mergeQueue)
      .values({
        cellId: cell_id,
        position: next,
        dependsOn: depends_on || null,
      })
      .returning();

    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /api/merge-queue/reorder — reorder the merge queue
router.patch('/reorder', async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'order must be an array of { id, position }' });
    }

    for (const item of order) {
      await db
        .update(mergeQueue)
        .set({ position: item.position })
        .where(eq(mergeQueue.id, item.id));
    }

    const rows = await db
      .select({
        id: mergeQueue.id,
        cellId: mergeQueue.cellId,
        position: mergeQueue.position,
        dependsOn: mergeQueue.dependsOn,
        addedAt: mergeQueue.addedAt,
        feature: cells.feature,
        project: cells.project,
        branch: cells.branch,
        status: cells.status,
        githubPrUrl: cells.githubPrUrl,
      })
      .from(mergeQueue)
      .innerJoin(cells, eq(cells.id, mergeQueue.cellId))
      .orderBy(asc(mergeQueue.position));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/merge-queue/:id
router.delete('/:id', async (req, res) => {
  try {
    const [deleted] = await db
      .delete(mergeQueue)
      .where(eq(mergeQueue.id, parseInt(req.params.id)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Merge queue entry not found' });
    }

    res.json({ deleted });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
