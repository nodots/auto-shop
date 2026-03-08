import { Router } from 'express';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { cells, cellStatusHistory } from '../db/schema.js';

const router = Router();

// GET /api/dashboard — aggregate dashboard data
router.get('/', async (_req, res) => {
  try {
    const statusCounts = await db
      .select({
        status: cells.status,
        count: sql<number>`count(*)::int`,
      })
      .from(cells)
      .groupBy(cells.status);

    const counts: Record<string, number> = {
      queued: 0, active: 0, blocked: 0, 'awaiting-review': 0, merged: 0,
    };
    for (const row of statusCounts) {
      counts[row.status] = row.count;
    }

    const blockedCells = await db
      .select({
        id: cells.id,
        feature: cells.feature,
        project: cells.project,
        branch: cells.branch,
        blocker: cells.blocker,
        updatedAt: cells.updatedAt,
      })
      .from(cells)
      .where(eq(cells.status, 'blocked'))
      .orderBy(desc(cells.updatedAt));

    const readyPRs = await db
      .select({
        id: cells.id,
        feature: cells.feature,
        project: cells.project,
        branch: cells.branch,
        githubPrUrl: cells.githubPrUrl,
        updatedAt: cells.updatedAt,
      })
      .from(cells)
      .where(eq(cells.status, 'awaiting-review'))
      .orderBy(desc(cells.updatedAt));

    const recentActivity = await db
      .select({
        id: cellStatusHistory.id,
        cellId: cellStatusHistory.cellId,
        fromStatus: cellStatusHistory.fromStatus,
        toStatus: cellStatusHistory.toStatus,
        changedAt: cellStatusHistory.changedAt,
        note: cellStatusHistory.note,
        feature: cells.feature,
        project: cells.project,
      })
      .from(cellStatusHistory)
      .innerJoin(cells, eq(cells.id, cellStatusHistory.cellId))
      .orderBy(desc(cellStatusHistory.changedAt))
      .limit(20);

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
