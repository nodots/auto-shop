#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { minimatch } = require('minimatch');
const {
  getAllowedCoordinationPaths,
  getArtifactPath,
} = require('./hooks/resolve-cell-artifact.js');

const gitRoot = process.cwd();
const scopePath = getArtifactPath(gitRoot, 'scope');

// No scope manifest = no restriction (main branch, hotfix, etc.)
if (!fs.existsSync(scopePath)) process.exit(0);

const scope = JSON.parse(fs.readFileSync(scopePath, 'utf8'));
const allowedCoordinationPaths = getAllowedCoordinationPaths(gitRoot);

const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

// SCOPE.json itself is always allowed
const violations = staged.filter(file => {
  if (allowedCoordinationPaths.has(file)) return false;

  const allowed = scope.allowedPaths.length > 0 &&
    scope.allowedPaths.some(pattern => minimatch(file, pattern));
  const forbidden = scope.forbiddenPaths.some(pattern => minimatch(file, pattern));

  return !allowed || forbidden;
});

if (violations.length > 0) {
  console.error(`\n❌ Scope violation — files outside ${path.relative(gitRoot, scopePath)} allowedPaths:\n`);
  violations.forEach(f => console.error(`  ${f}`));
  console.error(`\nUpdate ${path.relative(gitRoot, scopePath)} or move changes to the correct branch.\n`);
  process.exit(1);
}

console.log('✅ Scope check passed');
process.exit(0);
