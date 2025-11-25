#!/bin/bash
# Test audit flow - create, monitor, and verify email

BASE_URL="https://seochecksite.netlify.app"
EMAIL="Mreoch82@hotmail.com"
URL="https://seoauditpro.net"

echo "🧪 Testing Audit Flow"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Try to create test audit (if endpoint is deployed)
echo "Step 1: Creating test audit..."
AUDIT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/test-audit" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${URL}\", \"email\": \"${EMAIL}\"}")

# Check if we got a valid audit ID
AUDIT_ID=$(echo "$AUDIT_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('auditId', ''))" 2>/dev/null)

if [ -z "$AUDIT_ID" ]; then
  echo "⚠️  Test-audit endpoint not available yet, using retry on existing failed audit..."
  # Use the failed audit we saw earlier
  AUDIT_ID="f3cff1ce-fa1d-4971-b70b-ad6c31e1a5ee"
  echo "Using audit ID: $AUDIT_ID"
  
  echo "Retrying failed audit..."
  curl -s -X POST "${BASE_URL}/api/admin/retry-audit" \
    -H "Content-Type: application/json" \
    -d "{\"auditId\": \"${AUDIT_ID}\"}" > /dev/null &
  
  echo "Retry request sent (running in background)"
else
  echo "✅ Test audit created: $AUDIT_ID"
fi

echo ""
echo "Step 2: Monitoring audit progress..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

MAX_WAIT=10  # Check for up to 10 minutes
CHECK_INTERVAL=30  # Check every 30 seconds
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
  sleep $CHECK_INTERVAL
  ELAPSED=$((ELAPSED + CHECK_INTERVAL / 60))
  
  STATUS_RESPONSE=$(curl -s "${BASE_URL}/api/admin/check-audits")
  AUDIT_STATUS=$(echo "$STATUS_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for audit in data.get('audits', []):
    if audit.get('id') == '${AUDIT_ID}':
        print(f\"{audit.get('status')}|{audit.get('duration_minutes', 0)}\")
        break
" 2>/dev/null)
  
  if [ -z "$AUDIT_STATUS" ]; then
    echo "⏳ Still checking... (${ELAPSED} minutes elapsed)"
    continue
  fi
  
  STATUS=$(echo "$AUDIT_STATUS" | cut -d'|' -f1)
  DURATION=$(echo "$AUDIT_STATUS" | cut -d'|' -f2)
  
  echo "📊 Status: $STATUS | Duration: ${DURATION} minutes"
  
  if [ "$STATUS" = "completed" ]; then
    echo ""
    echo "✅ Audit completed successfully!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Audit ID: $AUDIT_ID"
    echo "Duration: ${DURATION} minutes"
    echo "Report URL: ${BASE_URL}/report/${AUDIT_ID}"
    echo ""
    echo "📧 Check email at: $EMAIL"
    echo "   Subject: 'Your SEO CheckSite Report for seoauditpro.net is Ready!'"
    exit 0
  elif [ "$STATUS" = "failed" ]; then
    echo ""
    echo "❌ Audit failed"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Audit ID: $AUDIT_ID"
    echo "Status: failed"
    echo ""
    echo "Attempting to fix stuck audits..."
    curl -s -X POST "${BASE_URL}/api/admin/fix-stuck-audits" \
      -H "Content-Type: application/json" | python3 -m json.tool
    exit 1
  elif [ "$DURATION" -gt 5 ]; then
    echo "⚠️  Audit running for more than 5 minutes, may be stuck"
  fi
done

echo ""
echo "⏱️  Timeout: Audit has been running for ${MAX_WAIT} minutes"
echo "Checking for stuck audits..."
curl -s -X POST "${BASE_URL}/api/admin/fix-stuck-audits" \
  -H "Content-Type: application/json" | python3 -m json.tool

exit 1

