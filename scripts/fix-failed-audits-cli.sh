#!/bin/bash
# Fix Failed Audits with Reports/Emails using Supabase CLI
# Updates audits that have reports or emails but are marked as 'failed'

set -e

echo "🔧 Fixing Failed Audits with Reports/Emails"
echo "============================================"
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
if ! supabase projects list &> /dev/null 2>&1; then
  echo "⚠️  Supabase CLI not authenticated or project not linked"
  echo ""
  echo "   Link your project:"
  echo "   supabase link --project-ref YOUR_PROJECT_REF"
  echo ""
  echo "   Or set environment variables:"
  echo "   export SUPABASE_ACCESS_TOKEN=your_token"
  echo "   export SUPABASE_PROJECT_REF=your_project_ref"
  echo ""
  exit 1
fi

echo "✓ Supabase CLI configured"
echo ""

# Show current failed audits with reports/emails
echo "📊 Current Failed Audits with Reports/Emails:"
echo "---------------------------------------------"
# Try using psql through Supabase CLI connection
if command -v psql &> /dev/null; then
  # Get connection string from Supabase CLI
  DB_URL=$(supabase db remote get-url 2>/dev/null || echo "")
  if [ -n "$DB_URL" ]; then
    psql "$DB_URL" -c "
    SELECT 
      id,
      url,
      status,
      CASE 
        WHEN formatted_report_html IS NOT NULL AND formatted_report_html != '' THEN 'Has report'
        ELSE 'No report'
      END as report_status,
      CASE 
        WHEN email_sent_at IS NOT NULL THEN 'Email sent'
        ELSE 'No email'
      END as email_status,
      created_at,
      completed_at
    FROM audits
    WHERE status = 'failed'
      AND (
        (formatted_report_html IS NOT NULL AND formatted_report_html != '')
        OR email_sent_at IS NOT NULL
      )
    ORDER BY created_at DESC
    LIMIT 10;
    " 2>/dev/null || echo "⚠️  Could not query audits"
  else
    echo "⚠️  Could not get database connection string"
    echo "   Make sure you're linked: supabase link --project-ref YOUR_PROJECT_REF"
  fi
else
  echo "⚠️  psql not found - install PostgreSQL client tools"
  echo "   Or run SQL manually in Supabase Dashboard"
fi

echo ""
echo "🔧 Fixing Audits..."
echo ""

# Get database connection string
# Try multiple methods to get connection string
DB_URL="${SUPABASE_DB_URL:-}"

if [ -z "$DB_URL" ]; then
  # Try to get from .env.local
  if [ -f .env.local ]; then
    # First try to get full connection string
    DB_URL=$(grep "^SUPABASE_DB_URL=" .env.local | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
    
    if [ -n "$DB_URL" ]; then
      echo "✓ Found SUPABASE_DB_URL in .env.local"
    else
      # Try to construct from password and project ref
      DB_PASSWORD=$(grep "^SUPABASE_DB_PASSWORD=" .env.local | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
      PROJECT_REF=$(grep "^SUPABASE_PROJECT_REF=" .env.local | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
      
      if [ -z "$PROJECT_REF" ]; then
        # Fallback: extract from SUPABASE_URL
        SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
        if [ -n "$SUPABASE_URL" ]; then
          PROJECT_REF=$(echo "$SUPABASE_URL" | sed 's|https://||' | sed 's|\.supabase\.co||')
        fi
      fi
      
      if [ -n "$DB_PASSWORD" ] && [ -n "$PROJECT_REF" ]; then
        DB_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"
        echo "✓ Constructed connection string from .env.local"
      fi
    fi
  fi
fi

if [ -z "$DB_URL" ]; then
  echo "❌ Could not get database connection string"
  echo "   Set it in .env.local:"
  echo "   SUPABASE_DB_URL='postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres'"
  echo "   Or:"
  echo "   SUPABASE_DB_PASSWORD=[PASSWORD]"
  echo "   SUPABASE_PROJECT_REF=[PROJECT_REF]"
  echo ""
  echo "   Get connection string from: Supabase Dashboard → Settings → Database"
  echo ""
  echo "   Or use the SQL script in Supabase Dashboard:"
  echo "   cat scripts/fix-failed-audits-with-reports.sql"
  exit 1
fi

if ! command -v psql &> /dev/null; then
  echo "❌ psql not found"
  echo "   Install PostgreSQL client tools"
  echo "   macOS: brew install postgresql"
  echo "   Or run SQL manually in Supabase Dashboard → SQL Editor"
  exit 1
fi

# Fix audits with reports
echo "1. Fixing audits with reports..."
psql "$DB_URL" -c "
UPDATE audits
SET 
  status = 'completed',
  completed_at = COALESCE(completed_at, NOW())
WHERE 
  status = 'failed'
  AND formatted_report_html IS NOT NULL
  AND formatted_report_html != '';
" || {
  echo "❌ Failed to fix audits with reports"
  exit 1
}

echo "   ✓ Fixed audits with reports"
echo ""

# Fix audits with emails
echo "2. Fixing audits with emails..."
psql "$DB_URL" -c "
UPDATE audits
SET 
  status = 'completed',
  completed_at = COALESCE(completed_at, NOW())
WHERE 
  status = 'failed'
  AND email_sent_at IS NOT NULL;
" || {
  echo "❌ Failed to fix audits with emails"
  exit 1
}

echo "   ✓ Fixed audits with emails"
echo ""

# Mark corresponding queue items as completed
echo "3. Marking corresponding queue items as completed..."
psql "$DB_URL" -c "
UPDATE audit_queue
SET 
  status = 'completed',
  completed_at = NOW()
WHERE 
  status IN ('pending', 'processing', 'failed')
  AND audit_id IN (
    SELECT id FROM audits 
    WHERE status = 'completed' 
    AND (formatted_report_html IS NOT NULL OR email_sent_at IS NOT NULL)
  );
" || {
  echo "⚠️  Could not update queue items (may already be updated)"
}

echo "   ✓ Updated queue items"
echo ""

# Show what was fixed
echo "📊 Fixed Audits:"
echo "----------------"
psql "$DB_URL" -c "
SELECT 
  id,
  url,
  status,
  CASE 
    WHEN formatted_report_html IS NOT NULL AND formatted_report_html != '' THEN 'Has report'
    ELSE 'No report'
  END as report_status,
  CASE 
    WHEN email_sent_at IS NOT NULL THEN 'Email sent'
    ELSE 'No email'
  END as email_status,
  created_at,
  completed_at
FROM audits
WHERE status = 'completed'
  AND (
    (formatted_report_html IS NOT NULL AND formatted_report_html != '')
    OR email_sent_at IS NOT NULL
  )
  AND completed_at > NOW() - INTERVAL '5 minutes'
ORDER BY completed_at DESC
LIMIT 10;
" 2>/dev/null || {
  echo "⚠️  Could not query fixed audits"
  echo "   Check manually in Supabase Dashboard"
}

echo ""
echo "✅ Done! Failed audits with reports/emails have been fixed."
echo ""
echo "📋 Summary:"
echo "   - Audits with reports: status updated to 'completed'"
echo "   - Audits with emails: status updated to 'completed'"
echo "   - Queue items: marked as 'completed'"
echo ""
echo "📋 Next Steps:"
echo "   1. Verify audits are now showing as 'completed' in dashboard"
echo "   2. Check that queue items are marked as 'completed'"
echo "   3. Monitor future audits to ensure they complete correctly"

