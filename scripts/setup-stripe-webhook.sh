#!/bin/bash

echo "🔧 Setting up Stripe webhook..."
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found. Installing..."
    brew install stripe/stripe-cli/stripe
fi

echo "✅ Stripe CLI version: $(stripe --version)"
echo ""

# Check if logged in
if ! stripe config --list &> /dev/null; then
    echo "⚠️  Not logged in to Stripe. Please run:"
    echo "   stripe login"
    echo ""
    exit 1
fi

echo "✅ Logged in to Stripe"
echo ""
echo "📡 Starting webhook listener..."
echo "   This will forward webhooks to: http://localhost:3000/api/webhooks/stripe"
echo ""
echo "   When you see 'Ready! Your webhook signing secret is whsec_...'"
echo "   Copy that secret and add it to .env.local as STRIPE_WEBHOOK_SECRET"
echo ""
echo "   Press Ctrl+C to stop"
echo ""

stripe listen --forward-to localhost:3000/api/webhooks/stripe

