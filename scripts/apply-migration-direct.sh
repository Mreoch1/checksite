#!/bin/bash
# Apply migration directly using Supabase REST API

set -e

echo "📋 Applying Migration via Supabase API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get Supabase credentials from Netlify
SUPABASE_URL=$(netlify env:get NEXT_PUBLIC_SUPABASE_URL 2>/dev/null | head -1)
SUPABASE_SERVICE_KEY=$(netlify env:get SUPABASE_SERVICE_ROLE_KEY 2>/dev/null | head -1)

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ Could not get Supabase credentials from Netlify"
  echo "   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set"
  exit 1
fi

echo "Supabase URL: $SUPABASE_URL"
echo ""

# Read migration file
MIGRATION_SQL=$(cat supabase/migrations/002_add_error_log.sql)

echo "Migration SQL:"
echo "$MIGRATION_SQL"
echo ""

# Execute via Supabase REST API (using PostgREST)
# Note: This requires the SQL to be wrapped in a function or executed via pg_catalog
# For direct SQL execution, we need to use the Management API or psql

echo "⚠️  Direct SQL execution via REST API is limited."
echo ""
echo "To apply the migration, use one of these methods:"
echo ""
echo "1. Supabase Dashboard SQL Editor:"
echo "   - Go to: https://supabase.com/dashboard/project/ybliuezkxrlgiydbfzqy/sql/new"
echo "   - Run: ALTER TABLE audits ADD COLUMN IF NOT EXISTS error_log TEXT;"
echo ""
echo "2. Supabase CLI (requires database password):"
echo "   supabase link --project-ref ybliuezkxrlgiydbfzqy"
echo "   supabase db push"
echo ""
echo "3. psql with connection string:"
echo "   psql \"postgresql://postgres.ybliuezkxrlgiydbfzqy:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres\" -c \"ALTER TABLE audits ADD COLUMN IF NOT EXISTS error_log TEXT;\""
