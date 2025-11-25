#!/bin/bash

echo "🚀 Setting up SiteCheck..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Check for .env.local
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Please create it with your API keys."
    exit 1
fi

echo "✅ .env.local found"
echo ""

# Check Stripe CLI
if ! command -v stripe &> /dev/null; then
    echo "⚠️  Stripe CLI not found."
    echo "   Install it with: brew install stripe/stripe-cli/stripe"
    echo "   Or download from: https://stripe.com/docs/stripe-cli"
    echo ""
    echo "   After installing, run:"
    echo "   stripe login"
    echo "   stripe listen --forward-to localhost:3000/api/webhooks/stripe"
    echo ""
else
    echo "✅ Stripe CLI found"
    echo ""
    echo "📡 To set up Stripe webhook for local testing:"
    echo "   1. Run: stripe login"
    echo "   2. Run: stripe listen --forward-to localhost:3000/api/webhooks/stripe"
    echo "   3. Copy the webhook signing secret (whsec_...) and add it to .env.local as STRIPE_WEBHOOK_SECRET"
    echo ""
fi

# Database migration reminder
echo "📊 Database Setup:"
echo "   1. Go to: https://supabase.com/dashboard/project/ybliuezkxrlgiydbfzqy/sql/new"
echo "   2. Copy and paste the SQL from: supabase/migrations/001_initial_schema.sql"
echo "   3. Run the migration"
echo ""

echo "✨ Setup complete!"
echo ""
echo "To start the development server:"
echo "   npm run dev"
echo ""
echo "Then open: http://localhost:3000"

