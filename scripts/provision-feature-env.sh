#!/bin/bash
# Usage: ./scripts/provision-feature-env.sh <feature-slug>

FEATURE_SLUG=$1
SCHEMA_NAME="feat_${FEATURE_SLUG//-/_}"
DB_URL=${DATABASE_URL:-"postgresql://localhost:5432/nodots_backgammon_dev"}

if [ -z "$FEATURE_SLUG" ]; then
  echo "Usage: $0 <feature-slug>"
  exit 1
fi

echo "Provisioning schema: $SCHEMA_NAME"
psql "$DB_URL" -c "CREATE SCHEMA IF NOT EXISTS \"$SCHEMA_NAME\";"

# Write feature-local .env
cat > .env.local << EOF
DATABASE_SCHEMA=$SCHEMA_NAME
PORT=$(node -e "console.log(3000 + Math.floor(Math.random() * 1000))")
FEATURE_SLUG=$FEATURE_SLUG
EOF

echo "✅ Environment provisioned. Schema: $SCHEMA_NAME"
echo "   .env.local written."
