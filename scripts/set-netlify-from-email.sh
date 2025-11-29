#!/bin/bash
# Set FROM_EMAIL environment variable in Netlify
# Usage: ./scripts/set-netlify-from-email.sh

set -e

echo "🔧 Setting FROM_EMAIL in Netlify..."
echo ""

# Check if netlify CLI is installed
if ! command -v netlify &> /dev/null; then
  echo "❌ Netlify CLI is not installed"
  echo "   Install it with: npm install -g netlify-cli"
  exit 1
fi

# Check if logged in
if ! netlify status &> /dev/null; then
  echo "⚠️  Not logged into Netlify. Logging in..."
  netlify login
fi

# Check if site is linked
if [ ! -f .netlify/state.json ]; then
  echo "⚠️  Site not linked. Linking now..."
  echo "   Please select 'seochecksite' when prompted"
  netlify link
fi

# Set the environment variable
echo "Setting FROM_EMAIL=admin@checksite.net..."
netlify env:set FROM_EMAIL admin@checksite.net

echo ""
echo "✅ FROM_EMAIL environment variable set successfully!"
echo ""
echo "📋 Verify it was set:"
echo "   netlify env:list | grep FROM_EMAIL"
echo ""
echo "🔄 Next steps:"
echo "   1. The change will take effect on the next deployment"
echo "   2. Or trigger a redeploy: netlify deploy --prod"
echo "   3. Test email sending again"
echo ""

