#!/bin/bash
# Full end-to-end test of the audit flow

set -e

URL="https://www.papajohns.com"
EMAIL="test-audit-papajohns@example.com"
NAME="Test User"

echo "=== Step 1: Test Module Recommendations ==="
RECOMMENDATIONS=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"url\":\"$URL\"}" \
  "https://seochecksite.netlify.app/api/recommend-modules")

echo "$RECOMMENDATIONS" | python3 -m json.tool
echo ""

# Extract recommended modules (accessibility and security should be true)
ACCESSIBILITY=$(echo "$RECOMMENDATIONS" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('accessibility', False))")
SECURITY=$(echo "$RECOMMENDATIONS" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('security', False))")

echo "Recommended modules:"
echo "  - accessibility: $ACCESSIBILITY"
echo "  - security: $SECURITY"
echo ""

echo "=== Step 2: Create Checkout Session ==="
# Select core modules + recommended ones
MODULES='["performance","crawl_health","on_page","mobile","accessibility","security"]'
CHECKOUT=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"url\":\"$URL\",\"email\":\"$EMAIL\",\"name\":\"$NAME\",\"modules\":$MODULES}" \
  "https://seochecksite.netlify.app/api/create-checkout")

echo "$CHECKOUT" | python3 -m json.tool
echo ""

# Since checkout doesn't return audit ID, we'll simulate Stripe webhook completion
# by calling test-audit endpoint directly with the same parameters
echo "=== Step 2b: Simulate Stripe Webhook (Create Audit Directly) ==="
AUDIT_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"url\":\"$URL\",\"email\":\"$EMAIL\",\"name\":\"$NAME\",\"modules\":$MODULES}" \
  "https://seochecksite.netlify.app/api/test-audit")

echo "$AUDIT_RESPONSE" | python3 -m json.tool
echo ""

AUDIT_ID=$(echo "$AUDIT_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('auditId', ''))" 2>/dev/null || echo "")

if [ -z "$AUDIT_ID" ]; then
  echo "ERROR: No audit ID returned from test-audit"
  exit 1
fi

echo "Created audit: $AUDIT_ID"
echo ""

echo "=== Step 3: Check Audit Status ==="
sleep 2
STATUS=$(curl -s "https://seochecksite.netlify.app/api/check-audit-status?id=$AUDIT_ID")
echo "$STATUS" | python3 -m json.tool
echo ""

echo "=== Step 4: Monitor Queue Processing ==="
echo "Waiting for queue processor to pick up audit..."
for i in {1..30}; do
  sleep 10
  STATUS=$(curl -s "https://seochecksite.netlify.app/api/check-audit-status?id=$AUDIT_ID")
  AUDIT_STATUS=$(echo "$STATUS" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('status', 'unknown'))" 2>/dev/null || echo "unknown")
  echo "[$i] Audit status: $AUDIT_STATUS"
  
  if [ "$AUDIT_STATUS" = "completed" ]; then
    echo "✅ Audit completed!"
    break
  elif [ "$AUDIT_STATUS" = "failed" ]; then
    echo "❌ Audit failed!"
    break
  fi
done

echo ""
echo "=== Step 5: Check Final Audit Status ==="
FINAL_STATUS=$(curl -s "https://seochecksite.netlify.app/api/check-audit-status?id=$AUDIT_ID")
echo "$FINAL_STATUS" | python3 -m json.tool

HAS_REPORT=$(echo "$FINAL_STATUS" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('hasReport', False))" 2>/dev/null || echo "False")
EMAIL_SENT=$(echo "$FINAL_STATUS" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('emailSent', False))" 2>/dev/null || echo "False")

echo ""
echo "=== Summary ==="
echo "Audit ID: $AUDIT_ID"
echo "Has Report: $HAS_REPORT"
echo "Email Sent: $EMAIL_SENT"
echo "Report URL: https://seochecksite.netlify.app/report/$AUDIT_ID"
