#!/bin/bash
# Fix Stuck Queue Items using direct psql connection
# Requires SUPABASE_DB_URL or connection string

set -e

echo "🔧 Fixing Stuck Queue Items (Direct Connection)"
echo "================================================"
echo ""

# Get connection string
if [ -z "$SUPABASE_DB_URL" ]; then
  # Try to construct from .env.local
  if [ -f .env.local ]; then
    SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    SUPABASE_SERVICE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    
    if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_KEY" ]; then
      PROJECT_REF=$(echo "$SUPABASE_URL" | sed 's|https://||' | sed 's|\.supabase\.co||')
      echo "✓ Found Supabase project: $PROJECT_REF"
      echo ""
      echo "⚠️  Direct psql connection requires database password"
      echo "   Get connection string from: Supabase Dashboard → Settings → Database"
      echo "   Then run: export SUPABASE_DB_URL='postgresql://...'"
      echo ""
      echo "   Or use the SQL script in Supabase Dashboard:"
      echo "   cat scripts/fix-stuck-queue.sql"
      exit 1
    fi
  fi
  
  echo "❌ SUPABASE_DB_URL not set"
  echo "   Get connection string from: Supabase Dashboard → Settings → Database"
  echo "   Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
  exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "❌ psql not found"
  echo "   Install PostgreSQL client tools"
  exit 1
fi

echo "✓ psql found"
echo "✓ Connection string configured"
echo ""

echo "📊 Current Queue Status:"
echo "----------------------"
psql "$SUPABASE_DB_URL" -c "
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest
FROM audit_queue
GROUP BY status;
" || {
  echo "❌ Failed to connect to database"
  exit 1
}

echo ""
echo "🔧 Fixing Stuck Items..."
echo ""

# Reset stuck "processing" items
echo "1. Resetting stuck 'processing' items (>10 minutes)..."
psql "$SUPABASE_DB_URL" -c "
UPDATE audit_queue
SET status = 'pending',
    started_at = NULL,
    last_error = 'Reset from stuck processing state'
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL '10 minutes';
" && echo "   ✓ Reset stuck processing items" || {
  echo "   ❌ Failed to reset stuck items"
  exit 1
}

echo ""

# Clear abandoned email reservations
echo "2. Clearing abandoned email reservations (>30 minutes)..."
psql "$SUPABASE_DB_URL" -c "
UPDATE audits
SET email_sent_at = NULL
WHERE email_sent_at IS NOT NULL
  AND email_sent_at < NOW() - INTERVAL '30 minutes'
  AND status = 'completed'
  AND formatted_report_html IS NOT NULL;
" && echo "   ✓ Cleared abandoned reservations" || {
  echo "   ❌ Failed to clear abandoned reservations"
  exit 1
}

echo ""

# Show updated status
echo "📊 Updated Queue Status:"
echo "----------------------"
psql "$SUPABASE_DB_URL" -c "
SELECT 
  status,
  COUNT(*) as count
FROM audit_queue
GROUP BY status;
"

echo ""
echo "✅ Done! Queue items have been reset."

