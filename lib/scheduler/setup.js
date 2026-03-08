'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { findProjectByRepo } = require('./scanner');

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Update GitHub labels for an issue: remove claude-ready, add the given label.
 */
function setLabel(repo, number, addLabel) {
  try {
    execSync(`gh issue edit ${number} --repo ${repo} --remove-label "claude-ready" --add-label "${addLabel}"`, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    // Label operations are best-effort
  }
}

/**
 * Full cell setup: create branch, SCOPE.json, generate prompt.
 *
 * Returns { localPath, branch, prompt } or throws on failure.
 */
function setupCell(issue) {
  const match = findProjectByRepo(issue.repo);
  if (!match) {
    throw new Error(`Repo ${issue.repo} not found in projects.json`);
  }

  const { project, packageEntry, localPath } = match;
  const featureTarget = (packageEntry && packageEntry.featureTarget) || project.featureTarget;
  const shortDesc = slugify(issue.title);
  const branchName = `feat/${shortDesc}`;

  if (!fs.existsSync(localPath)) {
    throw new Error(`Local path does not exist: ${localPath}`);
  }

  if (!fs.existsSync(path.join(localPath, '.git'))) {
    throw new Error(`Not a git repo: ${localPath}`);
  }

  // Stash any uncommitted changes before switching branches
  const statusOutput = execSync('git status --porcelain', { cwd: localPath, encoding: 'utf8' });
  const needsStash = statusOutput.trim().length > 0;
  if (needsStash) {
    execSync('git stash --include-untracked', { cwd: localPath, stdio: 'pipe' });
  }

  // Checkout base branch and pull
  execSync(`git fetch origin`, { cwd: localPath, stdio: 'pipe' });
  execSync(`git checkout ${featureTarget}`, { cwd: localPath, stdio: 'pipe' });
  execSync(`git pull origin ${featureTarget}`, { cwd: localPath, stdio: 'pipe' });

  // Create feature branch (if it already exists, check it out)
  try {
    execSync(`git checkout -b ${branchName}`, { cwd: localPath, stdio: 'pipe' });
  } catch {
    execSync(`git checkout ${branchName}`, { cwd: localPath, stdio: 'pipe' });
  }

  // Generate SCOPE.json from template
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

  execSync(`git add SCOPE.json && git commit -m "Add SCOPE.json for ${branchName}"`, {
    cwd: localPath,
    stdio: 'pipe',
  });

  // Generate prompt from template
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

module.exports = { setupCell, setLabel, slugify };
