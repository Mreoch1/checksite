#!/bin/bash
# Script to set up Inngest environment variables in Netlify

echo "🔧 Inngest Setup for Netlify"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This script will help you set up Inngest environment variables."
echo ""
echo "Prerequisites:"
echo "1. Sign up at https://www.inngest.com (free)"
echo "2. Create a new app"
echo "3. Get your credentials from the dashboard:"
echo "   - App ID"
echo "   - Event Key"
echo "   - Signing Key"
echo ""
read -p "Press Enter when you have your Inngest credentials ready..."

echo ""
echo "Enter your Inngest credentials:"
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
echo "Setting environment variables in Netlify..."
echo ""

netlify env:set INNGEST_APP_ID "$APP_ID"
netlify env:set INNGEST_EVENT_KEY "$EVENT_KEY"
netlify env:set INNGEST_SIGNING_KEY "$SIGNING_KEY"

echo ""
echo "✅ Environment variables set!"
echo ""
echo "Next steps:"
echo "1. Go to Inngest dashboard: https://www.inngest.com"
echo "2. Navigate to your app settings"
echo "3. Set the Sync Endpoint to: https://seochecksite.netlify.app/api/inngest"
echo "4. Save the configuration"
echo ""
echo "After deployment, Inngest will automatically discover your functions."
echo ""
echo "To verify, check:"
echo "  netlify env:list"

