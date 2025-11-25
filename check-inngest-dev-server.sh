#!/bin/bash
# Check Inngest dev server for credentials and configuration

echo "🔍 Checking Inngest Dev Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if dev server is running
if curl -s http://localhost:8288 > /dev/null 2>&1; then
  echo "✅ Inngest dev server is running at http://localhost:8288"
  echo ""
  echo "To get your credentials:"
  echo "1. Open http://localhost:8288 in your browser"
  echo "2. Go to 'Settings' or 'Apps' section"
  echo "3. Look for your app configuration"
  echo "4. You'll find App ID, Event Key, and Signing Key there"
  echo ""
else
  echo "❌ Inngest dev server is not running"
  echo ""
  echo "Start it with:"
  echo "  npx inngest-cli@latest dev"
  echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Alternative: Get from Inngest Dashboard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Go to https://www.inngest.com"
echo "2. Sign up/login"
echo "3. Create a new app"
echo "4. Go to App Settings"
echo "5. Find:"
echo "   - App ID (or App Slug)"
echo "   - Event Key"
echo "   - Signing Key"
echo ""
echo "Then set them with:"
echo "  ./setup-inngest-complete.sh"
echo ""

