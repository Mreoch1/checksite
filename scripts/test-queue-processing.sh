#!/bin/bash
# Test and monitor queue processing

SITE_URL="${1:-https://seochecksite.netlify.app}"
QUEUE_SECRET="${QUEUE_SECRET:-}"

echo "🔍 Testing Queue Processing"
echo "=========================="
echo "Site URL: $SITE_URL"
echo ""

# Check if QUEUE_SECRET is set
if [ -z "$QUEUE_SECRET" ]; then
  echo "⚠️  QUEUE_SECRET not set in environment"
  echo "   Testing without secret (may fail if QUEUE_SECRET is required)"
  ENDPOINT="$SITE_URL/api/process-queue"
else
  echo "✅ QUEUE_SECRET is set"
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
echo "Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Request successful"
else
  echo "❌ Request failed with status $HTTP_CODE"
fi

echo ""
echo "📊 Next steps:"
echo "   1. Check Netlify function logs for processing activity"
echo "   2. Check database for queue status changes"
echo "   3. Verify scheduled function appears in Netlify dashboard"

