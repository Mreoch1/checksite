#!/bin/bash
# Apply Supabase migration using CLI

set -e

echo "📋 Applying Supabase Migration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

MIGRATION_FILE="supabase/migrations/002_add_error_log.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "Migration file: $MIGRATION_FILE"
echo ""

# Try to apply migration
if supabase status > /dev/null 2>&1; then
  echo "✅ Supabase project is linked"
  echo "Applying migration..."
  supabase db push
elif [ -n "$SUPABASE_DB_URL" ] || [ -n "$DATABASE_URL" ]; then
  echo "✅ Found database URL in environment"
  DB_URL="${SUPABASE_DB_URL:-$DATABASE_URL}"
  echo "Applying migration via connection string..."
  supabase db execute --db-url "$DB_URL" < "$MIGRATION_FILE"
else
  echo "⚠️  Supabase project not linked and no DB URL found"
  echo ""
  echo "To apply the migration:"
  echo "1. Link your Supabase project:"
  echo "   supabase link --project-ref YOUR_PROJECT_REF"
  echo ""
  echo "2. Then run:"
  echo "   supabase db push"
  echo ""
  echo "Or set SUPABASE_DB_URL environment variable and run:"
  echo "   supabase db execute --db-url \$SUPABASE_DB_URL < $MIGRATION_FILE"
  exit 1
fi

echo ""
echo "✅ Migration applied successfully!"
