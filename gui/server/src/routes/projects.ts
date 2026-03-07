import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import pool from '../db.js';

const router = Router();

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..', '..', '..');

function loadProjectsJson() {
  const filePath = path.join(REPO_ROOT, 'projects.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8')).projects;
}

// GET /api/projects — list all projects from DB
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, json_agg(
        json_build_object(
          'name', pk.name, 'repo', pk.repo, 'path', pk.path,
          'featureTarget', pk.feature_target, 'scopeOverrides', pk.scope_overrides
        )
      ) FILTER (WHERE pk.id IS NOT NULL) AS packages
      FROM projects p
      LEFT JOIN packages pk ON pk.project_id = p.id
      GROUP BY p.id
      ORDER BY p.name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/projects/sync — sync projects.json to DB
router.post('/sync', async (_req, res) => {
  try {
    const projects = loadProjectsJson();
    let synced = 0;

    for (const [name, proj] of Object.entries(projects) as [string, any][]) {
      const result = await pool.query(
        `INSERT INTO projects (name, repo, local_path, default_branch, feature_target, promotion_path, scope_template, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (name) DO UPDATE SET
           repo = EXCLUDED.repo,
           local_path = EXCLUDED.local_path,
           default_branch = EXCLUDED.default_branch,
           feature_target = EXCLUDED.feature_target,
           promotion_path = EXCLUDED.promotion_path,
           scope_template = EXCLUDED.scope_template,
           synced_at = NOW()
         RETURNING id`,
        [name, proj.repo, proj.localPath, proj.defaultBranch, proj.featureTarget, proj.promotionPath, proj.scopeTemplate || null]
      );

      const projectId = result.rows[0].id;

      if (proj.packages) {
        // Remove old packages
        await pool.query('DELETE FROM packages WHERE project_id = $1', [projectId]);

        for (const [pkgName, pkg] of Object.entries(proj.packages) as [string, any][]) {
          await pool.query(
            `INSERT INTO packages (project_id, name, repo, path, feature_target, scope_overrides)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [projectId, pkgName, pkg.repo, pkg.path, pkg.featureTarget || null, pkg.scopeOverrides || null]
          );
        }
      }

      synced++;
    }

    res.json({ synced, total: Object.keys(projects).length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/projects/raw — read projects.json directly (no DB needed)
router.get('/raw', (_req, res) => {
  try {
    const projects = loadProjectsJson();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
