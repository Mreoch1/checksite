#!/bin/bash

echo "🔧 Setting Netlify Environment Variables"
echo ""

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "Installing Netlify CLI..."
    npm install -g netlify-cli
fi

echo "✅ Netlify CLI: $(netlify --version)"
echo ""

# Check if logged in
if ! netlify status &> /dev/null; then
    echo "⚠️  Not logged in to Netlify"
    echo "   Run: netlify login"
    exit 1
fi

echo "✅ Logged in to Netlify"
echo ""

# Check if site is linked
if [ ! -f .netlify/state.json ]; then
    echo "⚠️  Site not linked"
    echo "   Run: netlify init"
    echo "   Or link manually: netlify link"
    exit 1
fi

echo "✅ Site linked"
echo ""

# Set environment variables
echo "Setting environment variables..."
echo ""

netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://ybliuezkxrlgiydbfzqy.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibGl1ZXpreHJsZ2l5ZGJmenF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzI3ODUsImV4cCI6MjA3OTYwODc4NX0.Hkb_NEUSA7L6ITuL1zEePUHpHIcrvji0BVbfRbcYwtI"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibGl1ZXpreHJsZ2l5ZGJmenF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDAzMjc4NSwiZXhwIjoyMDc5NjA4Nzg1fQ.DDyIJuCm_m2-nY0jCmvXInn8JPKP36VpyXP898hkN8g"
netlify env:set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY "pk_test_51SXAll4OlWo66uf7qrTAcQQGGeXozYMSO5GsQb28fmBBXMsxaUOaHBcaVKKXrFvQyyVPL01YYtCg7RflPp9OHAqr00zjMhZE1w"
netlify env:set STRIPE_SECRET_KEY "YOUR_STRIPE_SECRET_KEY"
netlify env:set STRIPE_WEBHOOK_SECRET "whsec_278c5c756057a4a7d0c874a251c899c6707e6201e7702830e6265ca071ed9059"
netlify env:set RESEND_API_KEY "re_c4xMnX9L_KiUKdRg5tWXsg22ai1Wnh9jJ"
netlify env:set FROM_EMAIL "contact@seoauditpro.net"
netlify env:set DEEPSEEK_BASE_URL "https://api.deepseek.com"
netlify env:set DEEPSEEK_API_KEY "sk-d889f3c892094cdaa8fbd892a542b581"

echo ""
echo "✅ Environment variables set!"
echo ""
echo "⚠️  Don't forget to update NEXT_PUBLIC_SITE_URL after deployment:"
echo "   netlify env:set NEXT_PUBLIC_SITE_URL \"https://your-site-name.netlify.app\""
echo ""
echo "To view all env vars:"
echo "   netlify env:list"

