#!/bin/bash
# Monitor audit directly by ID

AUDIT_ID="bf835397-18f3-4669-9ba7-76d5fb0f47a4"
BASE_URL="https://seochecksite.netlify.app"
MAX_CHECKS=40  # 10 minutes (15 second intervals)
CHECK_INTERVAL=15

echo "🔍 Monitoring Audit (Direct Check)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Audit ID: $AUDIT_ID"
echo "URL: https://seoauditpro.net"
echo "Email: Mreoch82@hotmail.com"
echo ""
echo "Starting monitoring..."
echo ""

for i in $(seq 1 $MAX_CHECKS); do
  RESPONSE=$(curl -s "${BASE_URL}/api/check-audit-status?id=${AUDIT_ID}")
  STATUS=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('status', 'unknown'))" 2>/dev/null)
  CREATED=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('created_at', 'unknown'))" 2>/dev/null)
  
  if [ "$STATUS" = "unknown" ] || [ -z "$STATUS" ]; then
    echo "[$(date '+%H:%M:%S')] Check $i/$MAX_CHECKS - Status: Not found or error"
  else
    # Calculate duration
    if [ "$CREATED" != "unknown" ] && [ -n "$CREATED" ]; then
      DURATION=$(python3 -c "from datetime import datetime; import sys; created=datetime.fromisoformat('${CREATED}'.replace('Z', '+00:00')); now=datetime.now(created.tzinfo); diff=now-created; print(int(diff.total_seconds() / 60))" 2>/dev/null || echo "0")
      echo "[$(date '+%H:%M:%S')] Check $i/$MAX_CHECKS - Status: $STATUS (Running for ${DURATION} minutes)"
    else
      echo "[$(date '+%H:%M:%S')] Check $i/$MAX_CHECKS - Status: $STATUS"
    fi
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
    exit 0
  elif [ "$STATUS" = "failed" ]; then
    echo ""
    echo "❌ Audit failed"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "The audit encountered an error."
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

