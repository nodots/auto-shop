#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { minimatch } = require('minimatch');
const {
  getAllowedCoordinationPaths,
  getArtifactPath,
} = require('./resolve-cell-artifact.js');

// Read hook input from stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const event = JSON.parse(input);
    const toolName = event.tool_name;
    const filePath = event.tool_input && event.tool_input.file_path;

    // Only check Edit and Write tools with a file_path
    if (!filePath) {
      process.exit(0);
    }

    // Find git root (two dirs up from .claude/hooks/)
    const gitRoot = path.resolve(__dirname, '..', '..');
    const scopePath = getArtifactPath(gitRoot, 'scope');

    // No SCOPE.json = no restriction (main branch, hotfix, etc.)
    if (!fs.existsSync(scopePath)) {
      process.exit(0);
    }

    const scope = JSON.parse(fs.readFileSync(scopePath, 'utf8'));
    const allowedCoordinationPaths = getAllowedCoordinationPaths(gitRoot);

    // Convert absolute path to relative from git root
    const relativePath = path.relative(gitRoot, filePath);

    // Skip if path is outside the repo
    if (relativePath.startsWith('..')) {
      process.exit(0);
    }

    // Always allow coordination files
    if (allowedCoordinationPaths.has(relativePath)) {
      process.exit(0);
    }

    const allowed = scope.allowedPaths.length > 0 &&
      scope.allowedPaths.some(pattern => minimatch(relativePath, pattern));
    const forbidden = scope.forbiddenPaths.some(pattern => minimatch(relativePath, pattern));

    if (!allowed || forbidden) {
      process.stderr.write(
        `Scope violation: ${relativePath} is outside ${path.relative(gitRoot, scopePath)} allowedPaths. ` +
        `Write ${path.relative(gitRoot, getArtifactPath(gitRoot, 'blocker', { preferExisting: false }))} if you need to modify this file.`
      );
      process.exit(2);
    }

    process.exit(0);
  } catch (err) {
    // If we can't parse input or find scope, allow the operation
    // rather than blocking legitimate work
    process.exit(0);
  }
});
