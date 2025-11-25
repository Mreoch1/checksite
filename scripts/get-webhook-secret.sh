#!/bin/bash

echo "📡 Starting Stripe webhook listener..."
echo ""
echo "This will forward webhooks to: http://localhost:3000/api/webhooks/stripe"
echo ""
echo "When you see 'Ready! Your webhook signing secret is whsec_...'"
echo "Copy that secret and run:"
echo ""
echo "  echo 'STRIPE_WEBHOOK_SECRET=whsec_...' >> .env.local"
echo ""
echo "Or manually edit .env.local and add the webhook secret"
echo ""
echo "Press Ctrl+C to stop the webhook listener"
echo ""

stripe listen --forward-to localhost:3000/api/webhooks/stripe

