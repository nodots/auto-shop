'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PROJECTS_PATH = path.join(REPO_ROOT, 'projects.json');
const READY_LABELS = ['cell:queued', 'claude-ready'];
const ACTIVE_LABEL = 'cell:active';

function loadProjects() {
  return JSON.parse(fs.readFileSync(PROJECTS_PATH, 'utf8')).projects;
}

/**
 * Collect all unique repos from projects.json (including package repos).
 */
function allRepos() {
  const projects = loadProjects();
  const repos = new Set();

  for (const proj of Object.values(projects)) {
    repos.add(proj.repo);
    if (proj.packages) {
      for (const pkg of Object.values(proj.packages)) {
        repos.add(pkg.repo);
      }
    }
  }

  return [...repos];
}

/**
 * Scan all repos for issues with a dispatch-ready label.
 * Returns array of { repo, number, title, body }.
 */
function scanLabel(repos, label) {
  const issues = new Map();

  for (const repo of repos) {
    try {
      const raw = execSync(
        `gh issue list --repo ${repo} --label "${label}" --state open --json number,title,body,labels`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      const parsed = JSON.parse(raw);
      for (const issue of parsed) {
        const issueRef = `${repo}#${issue.number}`;
        issues.set(issueRef, {
          repo,
          number: issue.number,
          title: issue.title,
          body: issue.body || '',
          issueRef,
          labels: (issue.labels || []).map((entry) => entry.name || '').filter(Boolean),
        });
      }
    } catch {
      // Repo may not exist or gh may not have access — skip silently
    }
  }

  return [...issues.values()];
}

function scan() {
  const repos = allRepos();
  const issues = new Map();

  for (const label of READY_LABELS) {
    for (const issue of scanLabel(repos, label)) {
      issues.set(issue.issueRef, issue);
    }
  }

  return [...issues.values()];
}

function scanActive() {
  return scanLabel(allRepos(), ACTIVE_LABEL);
}

/**
 * Find the project entry in projects.json for a given repo.
 * Returns { projectName, project, packageName, packageEntry, localPath }.
 */
function findProjectByRepo(repo) {
  const projects = loadProjects();
  for (const [name, proj] of Object.entries(projects)) {
    if (proj.repo === repo) {
      return { projectName: name, project: proj, packageName: null, packageEntry: null, localPath: proj.localPath };
    }
    if (proj.packages) {
      for (const [pkgName, pkg] of Object.entries(proj.packages)) {
        if (pkg.repo === repo) {
          return {
            projectName: name,
            project: proj,
            packageName: pkgName,
            packageEntry: pkg,
            localPath: path.join(proj.localPath, pkg.path),
          };
        }
      }
    }
  }
  return null;
}

module.exports = { scan, scanActive, findProjectByRepo, loadProjects, allRepos, READY_LABELS, ACTIVE_LABEL };
