#!/bin/bash
# Monitor audit processing and time it

echo "🔍 Monitoring Audit Processing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get the most recent audit from Supabase
# Note: This requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set
# For now, we'll check via API or you can check manually in Supabase

echo "📊 To monitor the audit:"
echo ""
echo "1. Check Supabase Dashboard:"
echo "   - Go to: https://supabase.com/dashboard/project/ybliuezkxrlgiydbfzqy/editor"
echo "   - Open the 'audits' table"
echo "   - Look for the most recent audit for seoauditpro.net"
echo "   - Watch the 'status' field change: pending → running → completed"
echo ""
echo "2. Check Stripe Webhook:"
echo "   - Go to: https://dashboard.stripe.com/test/webhooks"
echo "   - Click on your webhook endpoint"
echo "   - Check 'Recent events' for checkout.session.completed"
echo ""
echo "3. Timing will be:"
echo "   - Payment completion → Webhook fires (usually < 5 seconds)"
echo "   - Webhook → Audit processing starts (immediate)"
echo "   - Audit processing → Report generation (depends on modules)"
echo "   - Report generation → Email sent (usually 2-5 minutes total)"
echo ""
echo "⏱️  Starting timer..."
echo "   Complete the payment now, then we'll track the processing time."
echo ""

# Wait for user to complete payment
read -p "Press Enter after you've completed the payment..."

PAYMENT_TIME=$(date +%s)
echo "✅ Payment completed at $(date)"
echo ""

# Poll Supabase API to check audit status
# Note: This would require API access. For now, manual check is easier.

echo "📋 Manual Check Instructions:"
echo ""
echo "1. Go to Supabase and find the audit"
echo "2. Note the 'created_at' timestamp"
echo "3. Note when 'status' changes to 'running'"
echo "4. Note when 'status' changes to 'completed'"
echo "5. Check your email: mreoch82@hotmail.com"
echo ""
echo "Expected timeline:"
echo "   - Payment → Webhook: < 5 seconds"
echo "   - Webhook → Processing starts: immediate"
echo "   - Processing → Complete: 2-5 minutes (depends on modules)"
echo "   - Complete → Email sent: immediate"
echo ""

