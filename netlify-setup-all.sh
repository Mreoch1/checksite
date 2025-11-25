#!/bin/bash
# Complete Netlify setup using CLI - checks status, env vars, and provides commands

set -e

echo "🔧 Netlify CLI Setup & Management"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
  echo "📦 Installing Netlify CLI..."
  npm install -g netlify-cli
  echo "✅ Netlify CLI installed"
  echo ""
fi

# Check login status
echo "🔐 Checking Netlify authentication..."
if ! netlify status &> /dev/null; then
  echo "❌ Not logged in. Logging in now..."
  netlify login
else
  echo "✅ Logged in to Netlify"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Current Site Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
netlify status
echo ""

# Get site URL
SITE_URL=$(netlify status --json 2>/dev/null | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('siteUrl', 'https://seochecksite.netlify.app'))" 2>/dev/null || echo "https://seochecksite.netlify.app")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Environment Variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
netlify env:list
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Quick Commands"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Set Inngest variables:"
echo "  netlify env:set INNGEST_APP_ID=your_app_id"
echo "  netlify env:set INNGEST_EVENT_KEY=your_event_key"
echo "  netlify env:set INNGEST_SIGNING_KEY=your_signing_key"
echo ""
echo "View all variables:"
echo "  netlify env:list"
echo ""
echo "View function logs:"
echo "  netlify logs:functions"
echo ""
echo "Deploy to production:"
echo "  netlify deploy --prod"
echo ""
echo "Open dashboard:"
echo "  netlify open"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔗 Inngest Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Sync Endpoint for Inngest:"
echo "  ${SITE_URL}/api/inngest"
echo ""
echo "To set up Inngest, run:"
echo "  ./setup-inngest-complete.sh"
echo ""

