'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PROJECTS_PATH = path.join(REPO_ROOT, 'projects.json');

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
 * Scan all repos for issues with the claude-ready label.
 * Returns array of { repo, number, title, body }.
 */
function scan() {
  const repos = allRepos();
  const issues = [];

  for (const repo of repos) {
    try {
      const raw = execSync(
        `gh issue list --repo ${repo} --label "claude-ready" --state open --json number,title,body,labels`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      const parsed = JSON.parse(raw);
      for (const issue of parsed) {
        issues.push({
          repo,
          number: issue.number,
          title: issue.title,
          body: issue.body || '',
          issueRef: `${repo}#${issue.number}`,
        });
      }
    } catch {
      // Repo may not exist or gh may not have access — skip silently
    }
  }

  return issues;
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

module.exports = { scan, findProjectByRepo, loadProjects, allRepos };
