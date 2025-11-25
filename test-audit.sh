#!/bin/bash
# Test the full audit flow and time it

echo "🧪 Testing Full Audit Flow"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

START_TIME=$(date +%s)
SITE_URL="https://seochecksite.netlify.app"
TEST_URL="seoauditpro.net"
TEST_EMAIL="mreoch82@hotmail.com"

echo "📋 Test Parameters:"
echo "   URL: $TEST_URL"
echo "   Email: $TEST_EMAIL"
echo "   Site: $SITE_URL"
echo ""

echo "Step 1: Getting module recommendations..."
RECOMMEND_START=$(date +%s)
RECOMMEND_RESPONSE=$(curl -s -X POST "$SITE_URL/api/recommend-modules" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$TEST_URL\"}")

if [ $? -ne 0 ]; then
  echo "❌ Failed to get recommendations"
  exit 1
fi

RECOMMEND_END=$(date +%s)
RECOMMEND_TIME=$((RECOMMEND_END - RECOMMEND_START))
echo "✅ Recommendations received (${RECOMMEND_TIME}s)"
echo ""

# Parse recommendations and select all modules
echo "Step 2: Creating checkout session with all modules..."
CHECKOUT_START=$(date +%s)

# All modules including optional ones
ALL_MODULES='["performance","crawl_health","on_page_seo","mobile","local","accessibility","security","schema","social","competitor_overview"]'

CHECKOUT_RESPONSE=$(curl -s -X POST "$SITE_URL/api/create-checkout" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"$TEST_URL\",
    \"email\": \"$TEST_EMAIL\",
    \"name\": \"Test User\",
    \"modules\": $ALL_MODULES
  }")

if [ $? -ne 0 ]; then
  echo "❌ Failed to create checkout"
  exit 1
fi

CHECKOUT_URL=$(echo $CHECKOUT_RESPONSE | grep -o '"checkoutUrl":"[^"]*' | cut -d'"' -f4)

if [ -z "$CHECKOUT_URL" ]; then
  echo "❌ No checkout URL in response"
  echo "Response: $CHECKOUT_RESPONSE"
  exit 1
fi

CHECKOUT_END=$(date +%s)
CHECKOUT_TIME=$((CHECKOUT_END - CHECKOUT_START))
echo "✅ Checkout session created (${CHECKOUT_TIME}s)"
echo "   Checkout URL: $CHECKOUT_URL"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏱️  Timing Summary:"
echo "   Recommendations: ${RECOMMEND_TIME}s"
echo "   Checkout Creation: ${CHECKOUT_TIME}s"
echo ""
echo "📝 Next Steps:"
echo "   1. Complete payment at: $CHECKOUT_URL"
echo "   2. Use test card: 4242 4242 4242 4242"
echo "   3. After payment, the webhook will trigger audit processing"
echo "   4. Monitor Supabase for audit status changes"
echo "   5. Check email: $TEST_EMAIL for the report"
echo ""
echo "💡 To monitor the audit:"
echo "   - Check Supabase audits table for status updates"
echo "   - Check Stripe webhook logs for delivery status"
echo "   - Check Netlify function logs for processing"
echo ""

