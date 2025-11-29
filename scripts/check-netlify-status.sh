#!/bin/bash
# Check Netlify Status using CLI

set -e

echo "🌐 Checking Netlify Status"
echo "=========================="
echo ""

# Check if netlify CLI is available
if ! command -v netlify &> /dev/null; then
  echo "❌ Netlify CLI not found"
  echo "   Install: npm install -g netlify-cli"
  exit 1
fi

echo "✓ Netlify CLI found"
echo ""

# Check if logged in
if ! netlify status &> /dev/null; then
  echo "⚠️  Not logged in or not linked to a site"
  echo "   Run: netlify login"
  echo "   Then: netlify link (or deploy from this directory)"
  exit 1
fi

echo "📋 Site Information:"
echo "-------------------"
netlify status 2>/dev/null || echo "⚠️  Could not get site status"
echo ""

echo "🔐 Environment Variables:"
echo "------------------------"
echo "Checking email-related variables..."
echo ""

# Check for email variables
netlify env:list 2>/dev/null | grep -E "SENDGRID|SMTP|EMAIL|FROM" || {
  echo "⚠️  No email-related environment variables found"
  echo "   Or variables may be hidden (use netlify env:get VARIABLE_NAME)"
}

echo ""
echo "📧 Email Configuration Check:"
echo "----------------------------"

# Check specific variables
for var in SENDGRID_API_KEY SMTP_PASSWORD FROM_EMAIL FROM_NAME QUEUE_SECRET; do
  value=$(netlify env:get "$var" 2>/dev/null || echo "")
  if [ -n "$value" ]; then
    if [[ "$var" == *"KEY"* ]] || [[ "$var" == *"PASSWORD"* ]] || [[ "$var" == *"SECRET"* ]]; then
      echo "  ✓ $var = [HIDDEN]"
    else
      echo "  ✓ $var = $value"
    fi
  else
    echo "  ✗ $var = NOT SET"
  fi
done

echo ""
echo "⚙️  Functions:"
echo "-------------"
netlify functions:list 2>/dev/null || echo "⚠️  Could not list functions"

echo ""
echo "📅 Scheduled Functions:"
echo "---------------------"
echo "Checking for scheduled functions..."
echo ""
echo "⚠️  Note: Scheduled functions may not be visible via CLI"
echo "   Check Netlify Dashboard → Functions → Scheduled functions"
echo "   Look for 'process-queue' function"

echo ""
echo "📊 Recent Deploys:"
echo "-----------------"
netlify deploy:list --limit 3 2>/dev/null || echo "⚠️  Could not list deploys"

echo ""
echo "📋 Next Steps:"
echo "   1. Verify scheduled function in Netlify Dashboard"
echo "   2. Check function logs: netlify functions:log process-queue"
echo "   3. Test queue endpoint manually if needed"

