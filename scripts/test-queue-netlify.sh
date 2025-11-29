#!/bin/bash
# Test Queue Processing using Netlify CLI

set -e

SITE_URL="${1:-}"
QUEUE_SECRET="${QUEUE_SECRET:-}"

echo "🧪 Testing Queue Processing"
echo "=========================="
echo ""

# Check if netlify CLI is available
if ! command -v netlify &> /dev/null; then
  echo "❌ Netlify CLI not found"
  echo "   Install: npm install -g netlify-cli"
  exit 1
fi

# Get site URL if not provided
if [ -z "$SITE_URL" ]; then
  echo "Getting site URL from Netlify..."
  SITE_URL=$(netlify status 2>/dev/null | grep "Site URL" | awk '{print $3}' || echo "")
  
  if [ -z "$SITE_URL" ]; then
    SITE_URL="https://seochecksite.netlify.app"
    echo "⚠️  Could not get site URL, using default: $SITE_URL"
  else
    echo "✓ Site URL: $SITE_URL"
  fi
else
  echo "✓ Using provided site URL: $SITE_URL"
fi

echo ""

# Get QUEUE_SECRET if not set
if [ -z "$QUEUE_SECRET" ]; then
  echo "Getting QUEUE_SECRET from Netlify..."
  QUEUE_SECRET=$(netlify env:get QUEUE_SECRET 2>/dev/null || echo "")
  
  if [ -z "$QUEUE_SECRET" ]; then
    echo "⚠️  QUEUE_SECRET not found in Netlify environment variables"
    echo "   Testing without secret (may fail if QUEUE_SECRET is required)"
    ENDPOINT="$SITE_URL/api/process-queue"
  else
    echo "✓ QUEUE_SECRET found"
    ENDPOINT="$SITE_URL/api/process-queue?secret=$QUEUE_SECRET"
  fi
else
  echo "✓ Using provided QUEUE_SECRET"
  ENDPOINT="$SITE_URL/api/process-queue?secret=$QUEUE_SECRET"
fi

echo ""
echo "📡 Calling queue processing endpoint..."
echo "   $ENDPOINT"
echo ""

# Make the request
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$ENDPOINT")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

echo "Response:"
echo "---------"
echo "HTTP Status: $HTTP_CODE"
echo ""

# Try to format JSON if possible
if command -v jq &> /dev/null; then
  echo "Body:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo "Body:"
  echo "$BODY"
fi

echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Request successful"
  echo ""
  echo "📊 Check Netlify function logs:"
  echo "   netlify functions:log process-queue"
else
  echo "❌ Request failed with status $HTTP_CODE"
  echo ""
  if [ "$HTTP_CODE" = "401" ]; then
    echo "⚠️  Authentication failed - check QUEUE_SECRET"
  fi
fi

echo ""
echo "📋 Next Steps:"
echo "   1. Check function logs: netlify functions:log process-queue"
echo "   2. Monitor queue status: node scripts/check-queue-status.js"
echo "   3. Check Netlify dashboard for scheduled function status"

