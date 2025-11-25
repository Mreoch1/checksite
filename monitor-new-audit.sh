#!/bin/bash
# Monitor the new audit until completion

AUDIT_ID="bf835397-18f3-4669-9ba7-76d5fb0f47a4"
BASE_URL="https://seochecksite.netlify.app"
MAX_CHECKS=40  # 10 minutes (15 second intervals)
CHECK_INTERVAL=15

echo "🔍 Monitoring New Audit"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Audit ID: $AUDIT_ID"
echo "URL: https://seoauditpro.net"
echo "Email: Mreoch82@hotmail.com"
echo "Modules: performance, crawl_health, on_page, mobile, accessibility, security, schema, social"
echo ""
echo "Starting monitoring..."
echo ""

for i in $(seq 1 $MAX_CHECKS); do
  RESPONSE=$(curl -s "${BASE_URL}/api/admin/check-audits")
  STATUS=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); audits=d.get('audits', []); audit=next((a for a in audits if a['id'] == '$AUDIT_ID'), None); print(audit['status'] if audit else 'not_found')" 2>/dev/null)
  DURATION=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); audits=d.get('audits', []); audit=next((a for a in audits if a['id'] == '$AUDIT_ID'), None); print(audit.get('duration_minutes', 0) if audit else 0)" 2>/dev/null)
  
  if [ "$STATUS" = "not_found" ]; then
    echo "[$(date '+%H:%M:%S')] Check $i/$MAX_CHECKS - Audit not found in recent audits list"
  else
    echo "[$(date '+%H:%M:%S')] Check $i/$MAX_CHECKS - Status: $STATUS (Running for ${DURATION} minutes)"
  fi
  
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
    echo "⏱️  Total time: ${DURATION} minutes"
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
echo "💡 If it's still stuck, you may need to check server logs."
exit 1

