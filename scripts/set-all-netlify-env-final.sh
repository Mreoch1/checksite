#!/bin/bash
# Set ALL environment variables in Netlify
# Update this script with your actual keys before running

set -e

echo "🔧 Setting All Netlify Environment Variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /Users/michaelreoch/sitecheck

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI not found. Install with: npm install -g netlify-cli"
    exit 1
fi

# Check if logged in
if ! netlify status &> /dev/null; then
    echo "❌ Not logged in to Netlify. Run: netlify login"
    exit 1
fi

echo "⚠️  IMPORTANT: Update this script with your actual API keys before running!"
echo "   See ENV_VARS_SETUP.md for where to get each key."
echo ""
read -p "Have you updated this script with your actual keys? [y/N]: " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please update the script with your actual keys first."
    exit 1
fi

echo ""
echo "Setting environment variables..."
echo ""

# Supabase
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://ybliuezkxrlgiydbfzqy.supabase.co" && echo "✅ NEXT_PUBLIC_SUPABASE_URL"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibGl1ZXpreHJsZ2l5ZGJmenF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzI3ODUsImV4cCI6MjA3OTYwODc4NX0.Hkb_NEUSA7L6ITuL1zEePUHpHIcrvji0BVbfRbcYwtI" && echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibGl1ZXpreHJsZ2l5ZGJmenF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDAzMjc4NSwiZXhwIjoyMDc5NjA4Nzg1fQ.DDyIJuCm_m2-nY0jCmvXInn8JPKP36VpyXP898hkN8g" && echo "✅ SUPABASE_SERVICE_ROLE_KEY"

# Stripe
netlify env:set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY "pk_test_51SXAll4OlWo66uf7qrTAcQQGGeXozYMSO5GsQb28fmBBXMsxaUOaHBcaVKKXrFvQyyVPL01YYtCg7RflPp9OHAqr00zjMhZE1w" && echo "✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
netlify env:set STRIPE_SECRET_KEY "YOUR_STRIPE_SECRET_KEY" && echo "⚠️  STRIPE_SECRET_KEY - UPDATE THIS!"
netlify env:set STRIPE_WEBHOOK_SECRET "whsec_278c5c756057a4a7d0c874a251c899c6707e6201e7702830e6265ca071ed9059" && echo "✅ STRIPE_WEBHOOK_SECRET"

# Resend
netlify env:set RESEND_API_KEY "re_c4xMnX9L_KiUKdRg5tWXsg22ai1Wnh9jJ" && echo "✅ RESEND_API_KEY"
netlify env:set FROM_EMAIL "contact@seoauditpro.net" && echo "✅ FROM_EMAIL"

# DeepSeek
netlify env:set DEEPSEEK_BASE_URL "https://api.deepseek.com" && echo "✅ DEEPSEEK_BASE_URL"
netlify env:set DEEPSEEK_API_KEY "sk-d889f3c892094cdaa8fbd892a542b581" && echo "✅ DEEPSEEK_API_KEY"

# Site URL
netlify env:set NEXT_PUBLIC_SITE_URL "https://seochecksite.netlify.app" && echo "✅ NEXT_PUBLIC_SITE_URL"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Environment variables set!"
echo ""
echo "⚠️  Don't forget to update STRIPE_SECRET_KEY with your actual key!"
echo ""
echo "To verify: ./scripts/verify-netlify-env.sh"
echo "To view all: netlify env:list"

