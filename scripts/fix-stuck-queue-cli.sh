#!/bin/bash
# Fix Stuck Queue Items using Supabase CLI

set -e

echo "🔧 Fixing Stuck Queue Items"
echo "============================"
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI not found"
  echo "   Install: npm install -g supabase"
  exit 1
fi

echo "✓ Supabase CLI found"
echo ""

# Check if linked to a project or use direct connection
SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"

if [ -z "$SUPABASE_PROJECT_REF" ]; then
  # Try to get from .env.local
  if [ -f .env.local ]; then
    SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    if [ -n "$SUPABASE_URL" ]; then
      SUPABASE_PROJECT_REF=$(echo "$SUPABASE_URL" | sed 's|https://||' | sed 's|\.supabase\.co||')
      echo "✓ Found project ref from .env.local: $SUPABASE_PROJECT_REF"
    fi
  fi
fi

if [ -z "$SUPABASE_PROJECT_REF" ]; then
  echo "⚠️  SUPABASE_PROJECT_REF not set"
  echo "   Set it: export SUPABASE_PROJECT_REF=your-project-ref"
  echo "   Or link project: supabase link --project-ref YOUR_PROJECT_REF"
  echo ""
  echo "   Alternatively, use the SQL script directly in Supabase dashboard:"
  echo "   cat scripts/fix-stuck-queue.sql"
  exit 1
fi

echo "📊 Current Queue Status:"
echo "----------------------"
# Use psql through Supabase CLI if available, otherwise provide SQL
if supabase db remote commit &> /dev/null 2>&1; then
  # Try to execute via Supabase CLI
  echo "Querying via Supabase CLI..."
else
  echo "⚠️  Supabase CLI not fully configured"
  echo "   Run this SQL in Supabase Dashboard → SQL Editor:"
  echo ""
  echo "   SELECT status, COUNT(*) as count, MIN(created_at) as oldest"
  echo "   FROM audit_queue GROUP BY status;"
  echo ""
fi

echo ""
echo "🔧 Fixing Stuck Items..."
echo ""

# Reset stuck "processing" items back to "pending"
echo "1. Resetting stuck 'processing' items (>10 minutes)..."
supabase db execute "
UPDATE audit_queue
SET status = 'pending',
    started_at = NULL,
    last_error = 'Reset from stuck processing state'
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL '10 minutes';
" || {
  echo "❌ Failed to reset stuck items"
  echo "   You may need to link your project: supabase link --project-ref YOUR_PROJECT_REF"
  exit 1
}

echo "   ✓ Reset stuck processing items"
echo ""

# Clear abandoned email reservations
echo "2. Clearing abandoned email reservations (>30 minutes)..."
supabase db execute "
UPDATE audits
SET email_sent_at = NULL
WHERE email_sent_at IS NOT NULL
  AND email_sent_at < NOW() - INTERVAL '30 minutes'
  AND status = 'completed'
  AND formatted_report_html IS NOT NULL;
" || {
  echo "❌ Failed to clear abandoned reservations"
  exit 1
}

echo "   ✓ Cleared abandoned reservations"
echo ""

# Show updated status
echo "📊 Updated Queue Status:"
echo "----------------------"
supabase db execute "
SELECT 
  status,
  COUNT(*) as count
FROM audit_queue
GROUP BY status;
" 2>/dev/null || echo "⚠️  Could not query updated status"

echo ""
echo "✅ Done! Queue items have been reset."
echo ""
echo "📋 Next Steps:"
echo "   1. Verify scheduled function is running in Netlify"
echo "   2. Test queue processing manually if needed"
echo "   3. Monitor queue status: node scripts/check-queue-status.js"

