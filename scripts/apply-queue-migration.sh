#!/bin/bash
# Apply the audit_queue migration using Supabase CLI

set -e

echo "📋 Applying Audit Queue Migration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

MIGRATION_FILE="supabase/migrations/003_create_audit_queue.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "Migration file: $MIGRATION_FILE"
echo ""

# Method 1: Try using db push (if project is linked)
if supabase status > /dev/null 2>&1; then
  echo "✅ Supabase project is linked"
  echo "Applying migration..."
  supabase db push
  echo ""
  echo "✅ Migration applied successfully!"
  exit 0
fi

# Method 2: Use db execute with connection string
if [ -n "$SUPABASE_DB_URL" ]; then
  echo "✅ Found SUPABASE_DB_URL in environment"
  echo "Applying migration via connection string..."
  supabase db execute --db-url "$SUPABASE_DB_URL" < "$MIGRATION_FILE"
  echo ""
  echo "✅ Migration applied successfully!"
  exit 0
fi

# Method 3: Instructions for manual application
echo "⚠️  Supabase project not linked and no DB URL found"
echo ""
echo "To apply the migration, choose one of these methods:"
echo ""
echo "METHOD 1: Link project and push (recommended)"
echo "  1. Get your database password from:"
echo "     https://supabase.com/dashboard/project/ybliuezkxrlgiydbfzqy/settings/database"
echo "  2. Link the project:"
echo "     supabase link --project-ref ybliuezkxrlgiydbfzqy"
echo "     (Enter your database password when prompted)"
echo "  3. Push migrations:"
echo "     supabase db push"
echo ""
echo "METHOD 2: Use connection string"
echo "  1. Set SUPABASE_DB_URL environment variable:"
echo "     export SUPABASE_DB_URL='postgresql://postgres.ybliuezkxrlgiydbfzqy:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres'"
echo "  2. Run this script again:"
echo "     ./scripts/apply-queue-migration.sh"
echo ""
echo "METHOD 3: Manual SQL execution"
echo "  1. Go to Supabase SQL Editor:"
echo "     https://supabase.com/dashboard/project/ybliuezkxrlgiydbfzqy/sql/new"
echo "  2. Copy and paste the contents of: $MIGRATION_FILE"
echo "  3. Click 'Run'"
echo ""
exit 1

