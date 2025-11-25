#!/bin/bash

# Run audit only after verifying build succeeded

set -e

echo "🔍 Verifying build status before running audit..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check build status
if ! ./scripts/check-build-status.sh; then
  echo ""
  echo "❌ Build check failed - not running audit"
  echo ""
  echo "To fix:"
  echo "1. Check Netlify dashboard for build errors"
  echo "2. Fix any build errors"
  echo "3. Wait for build to complete"
  echo "4. Run this script again"
  exit 1
fi

echo ""
echo "✅ Build verified - proceeding with audit..."
echo ""

# Run the audit
curl -X POST "https://seochecksite.netlify.app/api/test-audit" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://seoauditpro.net",
    "email": "mreoch82@hotmail.com",
    "modules": ["performance", "crawl_health", "on_page", "mobile", "accessibility", "security", "schema", "social", "competitor_overview"]
  }' \
  -s | python3 -m json.tool

