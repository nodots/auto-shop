#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ARTIFACT_NAMES = {
  scope: 'SCOPE.json',
  handoff: 'HANDOFF.md',
  blocker: 'BLOCKER.md',
};

function toRepoRelative(gitRoot, filePath) {
  return path.relative(gitRoot, filePath).split(path.sep).join('/');
}

function getCurrentBranch(gitRoot) {
  try {
    return execSync(`git -C "${gitRoot}" rev-parse --abbrev-ref HEAD`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function getBranchArtifactDir(gitRoot, branch) {
  if (!branch || branch === 'HEAD') {
    return null;
  }

  return path.join(gitRoot, '.auto-shop', 'cells', ...branch.split('/').filter(Boolean));
}

function getArtifactPath(gitRoot, kind, options = {}) {
  const branch = options.branch || getCurrentBranch(gitRoot);
  const artifactName = ARTIFACT_NAMES[kind];

  if (!artifactName) {
    throw new Error(`Unknown artifact kind: ${kind}`);
  }

  const branchDir = getBranchArtifactDir(gitRoot, branch);
  const branchScopedPath = branchDir ? path.join(branchDir, artifactName) : null;
  const rootPath = path.join(gitRoot, artifactName);

  const candidates = [];
  if (branchScopedPath) {
    candidates.push(branchScopedPath);
  }
  candidates.push(rootPath);

  if (options.preferExisting !== false) {
    const existing = candidates.find(candidate => fs.existsSync(candidate));
    if (existing) {
      return existing;
    }
  }

  return branchScopedPath || rootPath;
}

function getAllowedCoordinationPaths(gitRoot, options = {}) {
  const branch = options.branch || getCurrentBranch(gitRoot);
  const allowed = new Set();

  for (const kind of Object.keys(ARTIFACT_NAMES)) {
    allowed.add(ARTIFACT_NAMES[kind]);

    const branchPath = getArtifactPath(gitRoot, kind, {
      branch,
      preferExisting: false,
    });
    allowed.add(toRepoRelative(gitRoot, branchPath));
  }

  return allowed;
}

function ensureArtifactDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function main() {
  const [command, kind, gitRootArg] = process.argv.slice(2);
  const gitRoot = path.resolve(gitRootArg || process.cwd());

  if (!command || !kind) {
    process.stderr.write(
      'Usage: resolve-cell-artifact.js <path|exists> <scope|handoff|blocker> [git-root]\n'
    );
    process.exit(1);
  }

  const artifactPath = command === 'exists'
    ? getArtifactPath(gitRoot, kind, { preferExisting: true })
    : getArtifactPath(gitRoot, kind, { preferExisting: command !== 'path-new' });

  if (command === 'exists') {
    if (fs.existsSync(artifactPath)) {
      process.stdout.write(`${artifactPath}\n`);
      process.exit(0);
    }
    process.exit(1);
  }

  process.stdout.write(`${artifactPath}\n`);
}

if (require.main === module) {
  main();
} else {
  module.exports = {
    ARTIFACT_NAMES,
    ensureArtifactDirectory,
    getAllowedCoordinationPaths,
    getArtifactPath,
    getBranchArtifactDir,
    getCurrentBranch,
    toRepoRelative,
  };
}
