#!/bin/bash
# Usage: ./scripts/teardown-feature-env.sh <feature-slug>

FEATURE_SLUG=$1
SCHEMA_NAME="feat_${FEATURE_SLUG//-/_}"
DB_URL=${DATABASE_URL:-"postgresql://localhost:5432/nodots_dev"}

if [ -z "$FEATURE_SLUG" ]; then
  echo "Usage: $0 <feature-slug>"
  exit 1
fi

psql "$DB_URL" -c "DROP SCHEMA IF EXISTS \"$SCHEMA_NAME\" CASCADE;"
rm -f .env.local
echo "✅ Schema $SCHEMA_NAME dropped and .env.local removed."
