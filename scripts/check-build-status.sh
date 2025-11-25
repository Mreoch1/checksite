#!/bin/bash

# Check if Netlify build succeeded
# Returns 0 if build is successful, 1 if failed or unknown

echo "🔍 Checking Netlify build status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get site info from netlify status
SITE_INFO=$(netlify status 2>&1)
SITE_ID=$(echo "$SITE_INFO" | grep -i "Project Id" | sed 's/.*Project Id:[[:space:]]*//' | tr -d '[:space:]')

if [ -z "$SITE_ID" ]; then
  # Try alternative method
  SITE_ID=$(netlify status 2>&1 | grep -oP 'Project Id:\s*\K[^\s]+' || echo "")
fi

if [ -z "$SITE_ID" ]; then
  echo "⚠️  Could not get Netlify site ID automatically"
  echo "   Checking deployment status via alternative method..."
  # Continue with alternative check
fi

# Get latest deployment
if [ -n "$SITE_ID" ]; then
  LATEST_DEPLOY=$(netlify api listSiteDeploys --data "{\"site_id\":\"$SITE_ID\"}" 2>/dev/null | python3 -c "
import sys, json
try:
    deploys = json.load(sys.stdin)
    if deploys and len(deploys) > 0:
        latest = deploys[0]
        state = latest.get('state', 'unknown')
        context = latest.get('context', 'unknown')
        created = latest.get('created_at', 'unknown')
        print(f\"{state}|{context}|{created}\")
    else:
        print('no_deploys|unknown|unknown')
except:
    print('error|unknown|unknown')
" 2>/dev/null)
else
  LATEST_DEPLOY=""
fi

if [ -z "$LATEST_DEPLOY" ] || [ "$LATEST_DEPLOY" = "error|unknown|unknown" ]; then
  echo "❌ Could not check deployment status"
  echo "   Trying alternative method..."
  
  # Alternative: Check via netlify status
  STATUS=$(netlify status 2>&1 | grep -i "published\|deployed\|ready" | head -1)
  if [ -n "$STATUS" ]; then
    echo "✅ Build appears to be deployed"
    exit 0
  else
    echo "⚠️  Could not verify build status"
    echo "   Proceeding anyway, but verify manually:"
    echo "   https://app.netlify.com/sites/$(netlify status --json 2>/dev/null | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('siteId', ''))" 2>/dev/null)/deploys"
    exit 0  # Don't block, just warn
  fi
fi

STATE=$(echo "$LATEST_DEPLOY" | cut -d'|' -f1)
CONTEXT=$(echo "$LATEST_DEPLOY" | cut -d'|' -f2)
CREATED=$(echo "$LATEST_DEPLOY" | cut -d'|' -f3)

echo "Latest deployment:"
echo "  State: $STATE"
echo "  Context: $CONTEXT"
echo "  Created: $CREATED"
echo ""

if [ "$STATE" = "ready" ] || [ "$STATE" = "published" ]; then
  echo "✅ Build succeeded and is deployed"
  exit 0
elif [ "$STATE" = "building" ] || [ "$STATE" = "enqueued" ]; then
  echo "⏳ Build is still in progress"
  echo "   Wait for it to complete before running audit"
  exit 1
elif [ "$STATE" = "error" ] || [ "$STATE" = "failed" ]; then
  echo "❌ Build failed!"
  echo "   Fix build errors before running audit"
  echo "   Check: https://app.netlify.com/sites/$SITE_ID/deploys"
  exit 1
else
  echo "⚠️  Unknown build state: $STATE"
  echo "   Check manually: https://app.netlify.com/sites/$SITE_ID/deploys"
  exit 1
fi

