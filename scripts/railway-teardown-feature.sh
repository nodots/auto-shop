#!/bin/bash
# Railway Feature Schema Teardown
#
# Drops the feature-specific PostgreSQL schema after a feature branch is merged
# and the preview environment is destroyed.
#
# Usage: ./scripts/railway-teardown-feature.sh <feature-slug>
# Example: ./scripts/railway-teardown-feature.sh my-feature
#
# Environment: Expects DATABASE_URL to be set

set -e

FEATURE_SLUG="${1}"
DATABASE_URL="${DATABASE_URL:-}"

# Validate input
if [[ -z "$FEATURE_SLUG" ]]; then
    echo "❌ Usage: $0 <feature-slug>"
    echo ""
    echo "Examples:"
    echo "  $0 my-feature"
    echo "  $0 keyboard-nav"
    echo "  $0 api-integration"
    exit 1
fi

if [[ -z "$DATABASE_URL" ]]; then
    echo "❌ Error: DATABASE_URL environment variable not set"
    exit 1
fi

# Convert to schema name (replace hyphens with underscores)
SCHEMA_NAME="feat_${FEATURE_SLUG//-/_}"

echo "=== Railway Feature Teardown ==="
echo "Feature: $FEATURE_SLUG"
echo "Schema: $SCHEMA_NAME"
echo ""

# Verify the schema exists before dropping
echo "Checking schema existence..."
SCHEMA_EXISTS=$(psql "$DATABASE_URL" -tc "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = '$SCHEMA_NAME';" 2>/dev/null || echo "0")

if [[ "$SCHEMA_EXISTS" == "0" || "$SCHEMA_EXISTS" == "" ]]; then
    echo "⚠ Schema $SCHEMA_NAME does not exist (already dropped?)"
    exit 0
fi

# Drop the schema and all objects in it
echo "Dropping schema $SCHEMA_NAME..."
psql "$DATABASE_URL" -c "DROP SCHEMA IF EXISTS $SCHEMA_NAME CASCADE;" 2>/dev/null

if [[ $? -eq 0 ]]; then
    echo "✓ Schema dropped successfully"
else
    echo "⚠ Error dropping schema (may be in use or already dropped)"
    exit 1
fi

# Verify deletion
SCHEMA_VERIFY=$(psql "$DATABASE_URL" -tc "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = '$SCHEMA_NAME';" 2>/dev/null || echo "0")

if [[ "$SCHEMA_VERIFY" == "0" ]]; then
    echo "✓ Verification: Schema no longer exists"
    echo ""
    echo "=== Teardown Complete ==="
else
    echo "❌ Verification failed: Schema still exists"
    exit 1
fi
