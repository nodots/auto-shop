'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { findProjectByRepo, READY_LABELS } = require('./scanner');
const { SCHEDULER_DIR } = require('./queue');
const WORKTREES_ROOT = path.join(SCHEDULER_DIR, 'worktrees');
const WORKFLOW_LABELS = [...new Set([...READY_LABELS, 'cell:active', 'cell:blocked', 'cell:awaiting-review'])];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function runGit(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function worktreePathFor(issue, branchName) {
  const repoSlug = issue.repo.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const branchSlug = branchName.replace(/[^a-zA-Z0-9._-]+/g, '-');
  return path.join(WORKTREES_ROOT, repoSlug, branchSlug);
}

function localBranchExists(repoPath, branchName) {
  try {
    runGit(['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`], repoPath);
    return true;
  } catch {
    return false;
  }
}

function ensureWorktree(repoPath, issue, branchName, featureTarget) {
  const targetPath = worktreePathFor(issue, branchName);
  ensureDir(path.dirname(targetPath));

  runGit(['fetch', 'origin'], repoPath);
  runGit(['worktree', 'prune'], repoPath);

  if (!fs.existsSync(path.join(targetPath, '.git'))) {
    if (localBranchExists(repoPath, branchName)) {
      runGit(['worktree', 'add', '--force', targetPath, branchName], repoPath);
    } else {
      runGit(['worktree', 'add', '--force', '-b', branchName, targetPath, `origin/${featureTarget}`], repoPath);
    }
  }

  try {
    runGit(['checkout', branchName], targetPath);
  } catch {
    runGit(['checkout', '-b', branchName, `origin/${featureTarget}`], targetPath);
  }

  return targetPath;
}

function setLabel(repo, number, addLabel) {
  try {
    const removeArgs = WORKFLOW_LABELS
      .filter((label) => label !== addLabel)
      .flatMap((label) => ['--remove-label', label]);
    execFileSync('gh', ['issue', 'edit', String(number), '--repo', repo, ...removeArgs, '--add-label', addLabel], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    // Label operations are best-effort
  }
}

function setupCell(issue) {
  const match = findProjectByRepo(issue.repo);
  if (!match) {
    throw new Error(`Repo ${issue.repo} not found in projects.json`);
  }

  const { project, packageEntry, localPath: repoPath } = match;
  const featureTarget = (packageEntry && packageEntry.featureTarget) || project.featureTarget;
  const shortDesc = slugify(issue.title);
  const branchName = `feat/${shortDesc}`;

  if (!fs.existsSync(repoPath)) {
    throw new Error(`Local path does not exist: ${repoPath}`);
  }

  if (!fs.existsSync(path.join(repoPath, '.git'))) {
    throw new Error(`Not a git repo: ${repoPath}`);
  }

  const localPath = ensureWorktree(repoPath, issue, branchName, featureTarget);

  const scopeTemplatePath = project.scopeTemplate
    ? path.join(REPO_ROOT, project.scopeTemplate)
    : path.join(REPO_ROOT, 'templates', 'SCOPE.json');

  let scope;
  if (fs.existsSync(scopeTemplatePath)) {
    scope = JSON.parse(fs.readFileSync(scopeTemplatePath, 'utf8'));
  } else {
    scope = { allowedPaths: ['src/**', 'test/**'], forbiddenPaths: ['contracts/**', 'package.json', 'package-lock.json'] };
  }

  scope.feature = issue.title;
  scope.project = match.projectName;
  scope.branch = branchName;
  scope.createdAt = new Date().toISOString().slice(0, 10);

  if (packageEntry && packageEntry.scopeOverrides) {
    if (packageEntry.scopeOverrides.allowedPaths) scope.allowedPaths = packageEntry.scopeOverrides.allowedPaths;
    if (packageEntry.scopeOverrides.forbiddenPaths) scope.forbiddenPaths = packageEntry.scopeOverrides.forbiddenPaths;
  }

  const scopePath = path.join(localPath, 'SCOPE.json');
  fs.writeFileSync(scopePath, JSON.stringify(scope, null, 2) + '\n');

  runGit(['add', 'SCOPE.json'], localPath);
  try {
    runGit(['commit', '-m', `Add SCOPE.json for ${branchName}`], localPath);
  } catch {
    // Reusing an existing worktree/branch can leave SCOPE.json unchanged.
  }

  const prompt = buildPrompt(issue, match, branchName, shortDesc);

  return { localPath, branch: branchName, prompt };
}

function buildPrompt(issue, match, branchName, shortDesc) {
  const templatePath = path.join(REPO_ROOT, 'templates', 'implement-issue.template.md');
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  let template = fs.readFileSync(templatePath, 'utf8');
  const issueUrl = `https://github.com/${issue.repo}/issues/${issue.number}`;
  const baseBranch = match.packageEntry
    ? (match.packageEntry.featureTarget || match.project.featureTarget)
    : match.project.featureTarget;

  template = template.replace(/\[ISSUE_URL\]/g, issueUrl);
  template = template.replace(/\[BASE_BRANCH\]/g, baseBranch);
  template = template.replace(/\[SHORT_DESCRIPTION\]/g, shortDesc);
  template = template.replace(/\[ISSUE_NUMBER\]/g, String(issue.number));
  template = template.replace(/\[REPO\]/g, issue.repo);
  template = template.replace(/\[REPO_NAME\]/g, issue.repo.split('/')[1]);

  return template;
}

module.exports = { setupCell, setLabel, slugify, worktreePathFor };
