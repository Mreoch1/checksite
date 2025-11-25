#!/bin/bash
# Apply migration using psql (requires database password)

set -e

echo "📋 Applying Migration via psql"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SUPABASE_URL=$(netlify env:get NEXT_PUBLIC_SUPABASE_URL 2>/dev/null | head -1)

if [ -z "$SUPABASE_URL" ]; then
  echo "❌ Could not get Supabase URL"
  exit 1
fi

# Extract project ref from URL
PROJECT_REF=$(echo "$SUPABASE_URL" | sed 's|https://||' | sed 's|\.supabase\.co||')

echo "Project ref: $PROJECT_REF"
echo ""
echo "To apply the migration, you need the database password."
echo ""
echo "Run this command (you'll be prompted for password):"
echo ""
echo "psql \"postgresql://postgres.${PROJECT_REF}@aws-1-us-east-1.pooler.supabase.com:6543/postgres\" \\"
echo "  -c \"ALTER TABLE audits ADD COLUMN IF NOT EXISTS error_log TEXT;\""
echo ""
echo "Or get the password from:"
echo "https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database"
echo ""
echo "Alternatively, use Supabase Dashboard SQL Editor:"
echo "https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
