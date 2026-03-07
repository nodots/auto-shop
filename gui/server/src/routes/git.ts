import { Router } from 'express';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const router = Router();

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..', '..', '..');

function loadProjectsJson() {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'projects.json'), 'utf8')).projects;
}

function findLocalPath(repo: string): string | null {
  const projects = loadProjectsJson();
  for (const [, proj] of Object.entries(projects) as [string, any][]) {
    if (proj.repo === repo) return proj.localPath;
    if (proj.packages) {
      for (const [, pkg] of Object.entries(proj.packages) as [string, any][]) {
        if (pkg.repo === repo) return path.join(proj.localPath, pkg.path);
      }
    }
  }
  return null;
}

// GET /api/git/file?repo=owner/repo&branch=feat/x&path=SCOPE.json
// Read a file from a branch via `git show` (no checkout)
router.get('/file', (req, res) => {
  try {
    const { repo, branch, path: filePath } = req.query;
    if (!repo || !branch || !filePath) {
      return res.status(400).json({ error: 'repo, branch, and path are required' });
    }

    const localPath = findLocalPath(repo as string);
    if (!localPath || !fs.existsSync(localPath)) {
      return res.status(404).json({ error: `Local path for ${repo} not found` });
    }

    try {
      const content = execSync(`git show ${branch}:${filePath}`, {
        cwd: localPath,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      res.json({ content });
    } catch {
      res.status(404).json({ error: `File not found: ${branch}:${filePath}` });
    }
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/git/branches?repo=owner/repo — list feature branches
router.get('/branches', (req, res) => {
  try {
    const { repo } = req.query;
    if (!repo) {
      return res.status(400).json({ error: 'repo is required' });
    }

    const localPath = findLocalPath(repo as string);
    if (!localPath || !fs.existsSync(localPath)) {
      return res.status(404).json({ error: `Local path for ${repo} not found` });
    }

    const output = execSync('git branch -a --format="%(refname:short)"', {
      cwd: localPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const branches = output.trim().split('\n').filter(b => b.startsWith('feat/') || b.startsWith('contract/'));
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
