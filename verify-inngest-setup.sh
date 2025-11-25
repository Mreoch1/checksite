#!/bin/bash
# Verify Inngest setup

echo "🔍 Verifying Inngest Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Netlify status
echo "📊 Netlify Site:"
netlify status | grep -E "(Current project|Project URL)" || netlify status
echo ""

# Try to get variables
echo "🔑 Environment Variables:"
echo ""

EVENT_KEY=$(netlify env:get INNGEST_EVENT_KEY 2>&1 | grep -v "No value" | grep -v "Warning" | tail -1)
SIGNING_KEY=$(netlify env:get INNGEST_SIGNING_KEY 2>&1 | grep -v "No value" | grep -v "Warning" | tail -1)
APP_ID=$(netlify env:get INNGEST_APP_ID 2>&1 | grep -v "No value" | grep -v "Warning" | tail -1)

if [ -n "$EVENT_KEY" ] && [ "$EVENT_KEY" != "No value set" ]; then
  echo "✅ INNGEST_EVENT_KEY: Set (${#EVENT_KEY} characters)"
else
  echo "❌ INNGEST_EVENT_KEY: Not set"
fi

if [ -n "$SIGNING_KEY" ] && [ "$SIGNING_KEY" != "No value set" ]; then
  echo "✅ INNGEST_SIGNING_KEY: Set (${#SIGNING_KEY} characters)"
else
  echo "❌ INNGEST_SIGNING_KEY: Not set"
fi

if [ -n "$APP_ID" ] && [ "$APP_ID" != "No value set" ]; then
  echo "✅ INNGEST_APP_ID: Set ($APP_ID)"
else
  echo "❌ INNGEST_APP_ID: Not set"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 If variables are not set, run:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "netlify env:set INNGEST_EVENT_KEY=\"qriSl06IJFgduy3_ybq51qT6_FfcXE8one2dYZfyLku-sISoxzlB1VVqg39Qo4gL-kn88vUzrSNDv2k4A9D5dA\""
echo "netlify env:set INNGEST_SIGNING_KEY=\"signkey-prod-ad5a127e7839b3b367d2632fba048f14863a4734f7a2ed820a9a161b0210eae1\""
echo "netlify env:set INNGEST_APP_ID=\"seo-checksite\""
echo ""
echo "Or check in Netlify dashboard:"
echo "  netlify open"
echo ""

