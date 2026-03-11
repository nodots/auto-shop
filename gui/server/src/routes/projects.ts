import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { projects, packages } from '../db/schema.js';

const router = Router();

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..', '..', '..');

function loadProjectsJson() {
  const filePath = path.join(REPO_ROOT, 'projects.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8')).projects;
}

// GET /api/projects — list all projects from DB with packages
router.get('/', async (_req, res) => {
  try {
    const allProjects = await db.query.projects.findMany({
      orderBy: (p, { asc }) => [asc(p.name)],
    });

    const allPackages = await db.query.packages.findMany();

    const result = allProjects.map(p => ({
      ...p,
      packages: allPackages
        .filter(pkg => pkg.projectId === p.id)
        .map(pkg => ({
          name: pkg.name,
          repo: pkg.repo,
          path: pkg.path,
          featureTarget: pkg.featureTarget,
          scopeOverrides: pkg.scopeOverrides,
        })),
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/projects/sync — sync projects.json to DB
router.post('/sync', async (_req, res) => {
  try {
    const projectsData = loadProjectsJson();
    let synced = 0;

    for (const [name, proj] of Object.entries(projectsData) as [string, any][]) {
      const [row] = await db
        .insert(projects)
        .values({
          name,
          repo: proj.repo,
          localPath: proj.localPath,
          defaultBranch: proj.defaultBranch,
          featureTarget: proj.featureTarget,
          promotionPath: proj.promotionPath,
          scopeTemplate: proj.scopeTemplate || null,
          syncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: projects.name,
          set: {
            repo: proj.repo,
            localPath: proj.localPath,
            defaultBranch: proj.defaultBranch,
            featureTarget: proj.featureTarget,
            promotionPath: proj.promotionPath,
            scopeTemplate: proj.scopeTemplate || null,
            syncedAt: new Date(),
          },
        })
        .returning();

      if (proj.packages) {
        await db.delete(packages).where(eq(packages.projectId, row.id));

        for (const [pkgName, pkg] of Object.entries(proj.packages) as [string, any][]) {
          await db.insert(packages).values({
            projectId: row.id,
            name: pkgName,
            repo: pkg.repo,
            path: pkg.path,
            featureTarget: pkg.featureTarget || null,
            scopeOverrides: pkg.scopeOverrides || null,
          });
        }
      }

      synced++;
    }

    res.json({ synced, total: Object.keys(projectsData).length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/projects/raw — read projects.json directly (no DB needed)
router.get('/raw', (_req, res) => {
  try {
    const projectsData = loadProjectsJson();
    res.json(projectsData);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
