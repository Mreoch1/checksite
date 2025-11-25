#!/bin/bash
# Complete Inngest setup using Netlify CLI

set -e

echo "🚀 Complete Inngest Setup with Netlify CLI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
  echo "❌ Netlify CLI not found. Installing..."
  npm install -g netlify-cli
fi

# Check if logged in
echo "📋 Checking Netlify status..."
if ! netlify status &> /dev/null; then
  echo "❌ Not logged in to Netlify. Please login:"
  netlify login
fi

# Show current status
echo ""
echo "Current Netlify Status:"
netlify status
echo ""

# Get Inngest credentials
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Inngest Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To get your Inngest credentials:"
echo "1. Go to https://www.inngest.com"
echo "2. Sign up/login (free account)"
echo "3. Create a new app"
echo "4. Get your credentials from the dashboard"
echo ""
read -p "Press Enter when you have your credentials ready..."
echo ""

read -p "INNGEST_APP_ID: " APP_ID
read -p "INNGEST_EVENT_KEY: " EVENT_KEY
read -p "INNGEST_SIGNING_KEY: " SIGNING_KEY

if [ -z "$APP_ID" ] || [ -z "$EVENT_KEY" ] || [ -z "$SIGNING_KEY" ]; then
  echo ""
  echo "❌ Error: All credentials are required"
  exit 1
fi

echo ""
echo "🔧 Setting environment variables in Netlify..."
echo ""

# Set environment variables
netlify env:set INNGEST_APP_ID "$APP_ID"
netlify env:set INNGEST_EVENT_KEY "$EVENT_KEY"
netlify env:set INNGEST_SIGNING_KEY "$SIGNING_KEY"

echo ""
echo "✅ Environment variables set!"
echo ""

# Verify
echo "📋 Verifying environment variables..."
netlify env:list | grep INNGEST || echo "⚠️  Variables not showing (may need to refresh)"
echo ""

# Get site info
SITE_URL=$(netlify status --json 2>/dev/null | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('siteUrl', 'https://seochecksite.netlify.app'))" 2>/dev/null || echo "https://seochecksite.netlify.app")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Configure Inngest Dashboard:"
echo "   - Go to https://www.inngest.com"
echo "   - Navigate to your app"
echo "   - Set Sync Endpoint to:"
echo "     ${SITE_URL}/api/inngest"
echo ""
echo "2. Deploy (if not auto-deployed):"
echo "   netlify deploy --prod"
echo ""
echo "3. Test the integration:"
echo "   curl -X POST \"${SITE_URL}/api/test-audit\" \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"url\": \"https://seoauditpro.net\", \"email\": \"test@example.com\"}'"
echo ""
echo "4. Monitor in Inngest dashboard"
echo ""
echo "📄 View all environment variables:"
echo "   netlify env:list"
echo ""
echo "📄 View site status:"
echo "   netlify status"
echo ""

