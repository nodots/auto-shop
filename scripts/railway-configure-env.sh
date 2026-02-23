#!/bin/bash
# Railway Feature Environment Configuration
#
# This script extracts the feature name from the Git branch and configures
# environment variables for use by deployment hooks.
#
# Usage: Called automatically by Railway deploy hook
# Environment: Expects RAILWAY_GIT_BRANCH to be set

set -e

# Get the current branch name
BRANCH="${RAILWAY_GIT_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"

echo "=== Railway Environment Configuration ==="
echo "Branch: $BRANCH"

# Skip configuration for production branches
if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
    echo "✓ Production branch detected, using main environment"
    exit 0
fi

# Extract feature slug from branch name
# Handles: feat/my-feature, feat/my-feature-v1, feature/something, etc.
if [[ "$BRANCH" =~ ^(feat|feature)\/(.+)$ ]]; then
    FEATURE_NAME="${BASH_REMATCH[2]}"
else
    FEATURE_NAME="$BRANCH"
fi

# Convert to schema-safe name (replace hyphens with underscores)
SCHEMA_NAME="feat_${FEATURE_NAME//-/_}"

echo "Feature: $FEATURE_NAME"
echo "Schema: $SCHEMA_NAME"

# Export for use in subsequent scripts
export FEATURE_SLUG="$FEATURE_NAME"
export FEATURE_SCHEMA="$SCHEMA_NAME"

# Log for debugging
{
    echo "=== Railway Environment Configuration ==="
    echo "Branch: $BRANCH"
    echo "Feature Slug: $FEATURE_SLUG"
    echo "Feature Schema: $FEATURE_SCHEMA"
    echo "Timestamp: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
} >> /tmp/railway-env.log

echo "✓ Environment configured"
echo "  FEATURE_SLUG=$FEATURE_SLUG"
echo "  FEATURE_SCHEMA=$FEATURE_SCHEMA"
