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

# Check if linked to a project
if ! supabase status &> /dev/null; then
  echo "⚠️  Not linked to a Supabase project"
  echo "   Linking to project..."
  echo "   (You may need to run: supabase link --project-ref YOUR_PROJECT_REF)"
  echo ""
fi

echo "📊 Current Queue Status:"
echo "----------------------"
supabase db execute "
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest
FROM audit_queue
GROUP BY status;
" 2>/dev/null || echo "⚠️  Could not query queue status (may need to link project)"

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

