#!/bin/bash
# Monitor a test audit until completion

AUDIT_ID="${1:-0d5be98f-6155-4a16-93e0-3b4c2a3a69f8}"
BASE_URL="https://seochecksite.netlify.app"
MAX_CHECKS=40  # 10 minutes (15 second intervals)
CHECK_INTERVAL=15

echo "🔍 Monitoring Audit: $AUDIT_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for i in $(seq 1 $MAX_CHECKS); do
  STATUS_RESPONSE=$(curl -s "${BASE_URL}/api/check-audit-status?id=${AUDIT_ID}")
  STATUS=$(echo "$STATUS_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('status', 'unknown'))" 2>/dev/null)
  
  echo "[$(date '+%H:%M:%S')] Check $i/$MAX_CHECKS - Status: $STATUS"
  
  if [ "$STATUS" = "completed" ]; then
    echo ""
    echo "✅✅✅ AUDIT COMPLETED SUCCESSFULLY! ✅✅✅"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📧 Email should be sent to: mreoch82@hotmail.com"
    echo "   Subject: 'Your SEO CheckSite Report for seoauditpro.net is Ready!'"
    echo ""
    echo "🔗 View Report: ${BASE_URL}/report/${AUDIT_ID}"
    echo ""
    exit 0
  elif [ "$STATUS" = "failed" ]; then
    echo ""
    echo "❌ Audit failed"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
  fi
  
  if [ $i -lt $MAX_CHECKS ]; then
    sleep $CHECK_INTERVAL
  fi
done

echo ""
echo "⏱️  Timeout: Audit still running after $((MAX_CHECKS * CHECK_INTERVAL / 60)) minutes"
echo "   Current status: $STATUS"
echo "   Check manually: ${BASE_URL}/report/${AUDIT_ID}"
exit 1

