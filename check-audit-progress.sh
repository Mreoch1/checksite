#!/bin/bash
# Monitor a specific audit until completion

AUDIT_ID="2643d20f-0a78-4ad5-8717-ac7fe9a7fa72"
BASE_URL="https://seochecksite.netlify.app"
MAX_CHECKS=20  # 5 minutes (15 second intervals)
CHECK_INTERVAL=15

echo "🔍 Monitoring Audit Progress"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Audit ID: $AUDIT_ID"
echo "Email: Mreoch82@hotmail.com"
echo "URL: https://seoauditpro.net"
echo ""

for i in $(seq 1 $MAX_CHECKS); do
  RESPONSE=$(curl -s "${BASE_URL}/api/admin/check-audits")
  STATUS=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); audit=d['audits'][0] if d['audits'] else None; print(audit['status'] if audit else 'unknown')" 2>/dev/null)
  DURATION=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); audit=d['audits'][0] if d['audits'] else None; print(audit['duration_minutes'] if audit else '0')" 2>/dev/null)
  
  echo "[$(date '+%H:%M:%S')] Check $i/$MAX_CHECKS - Status: $STATUS (Running for ${DURATION} minutes)"
  
  if [ "$STATUS" = "completed" ]; then
    echo ""
    echo "✅✅✅ AUDIT COMPLETED SUCCESSFULLY! ✅✅✅"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📧 Email should be sent to: Mreoch82@hotmail.com"
    echo "   Subject: 'Your SEO CheckSite Report for seoauditpro.net is Ready!'"
    echo ""
    echo "🔗 View Report: ${BASE_URL}/report/${AUDIT_ID}"
    echo ""
    exit 0
  elif [ "$STATUS" = "failed" ]; then
    echo ""
    echo "❌ Audit failed"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "The audit encountered an error. Check logs or retry."
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
echo ""
echo "💡 If it's still stuck, you may need to:"
echo "   1. Check server logs for errors"
echo "   2. Retry the audit: curl -X POST ${BASE_URL}/api/admin/retry-audit -H 'Content-Type: application/json' -d '{\"auditId\": \"${AUDIT_ID}\"}'"
exit 1

