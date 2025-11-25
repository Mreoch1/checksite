#!/bin/bash
set -e

echo "🚀 Complete Netlify Setup for SEO CheckSite"
echo "========================================"
echo ""

cd /Users/michaelreoch/sitecheck

# Step 1: Install Netlify CLI if needed
echo "📦 Step 1: Checking Netlify CLI..."
if ! command -v netlify &> /dev/null; then
    echo "   Installing Netlify CLI..."
    npm install -g netlify-cli
else
    echo "   ✅ Netlify CLI already installed"
    netlify --version
fi

echo ""

# Step 2: Login
echo "🔐 Step 2: Checking Netlify login..."
if ! netlify status &> /dev/null; then
    echo "   Please login to Netlify (will open browser)..."
    netlify login
else
    echo "   ✅ Already logged in"
fi

echo ""

# Step 3: Link site
echo "🔗 Step 3: Linking site..."
if [ ! -f .netlify/state.json ]; then
    echo "   Site not linked. Options:"
    echo "   1. Link existing site: netlify link --name seochecksite"
    echo "   2. Create new site: netlify init"
    echo ""
    read -p "   Link existing site (seochecksite)? [y/n]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        netlify link --name seochecksite || netlify link
    else
        netlify init
    fi
else
    echo "   ✅ Site already linked"
    netlify status
fi

echo ""

# Step 4: Set environment variables
echo "📝 Step 4: Setting environment variables..."
echo ""

netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://ybliuezkxrlgiydbfzqy.supabase.co" && echo "   ✅ NEXT_PUBLIC_SUPABASE_URL"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibGl1ZXpreHJsZ2l5ZGJmenF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzI3ODUsImV4cCI6MjA3OTYwODc4NX0.Hkb_NEUSA7L6ITuL1zEePUHpHIcrvji0BVbfRbcYwtI" && echo "   ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibGl1ZXpreHJsZ2l5ZGJmenF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDAzMjc4NSwiZXhwIjoyMDc5NjA4Nzg1fQ.DDyIJuCm_m2-nY0jCmvXInn8JPKP36VpyXP898hkN8g" && echo "   ✅ SUPABASE_SERVICE_ROLE_KEY"
netlify env:set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY "pk_test_51SXAll4OlWo66uf7qrTAcQQGGeXozYMSO5GsQb28fmBBXMsxaUOaHBcaVKKXrFvQyyVPL01YYtCg7RflPp9OHAqr00zjMhZE1w" && echo "   ✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
netlify env:set STRIPE_SECRET_KEY "YOUR_STRIPE_SECRET_KEY" && echo "   ✅ STRIPE_SECRET_KEY"
netlify env:set STRIPE_WEBHOOK_SECRET "whsec_278c5c756057a4a7d0c874a251c899c6707e6201e7702830e6265ca071ed9059" && echo "   ✅ STRIPE_WEBHOOK_SECRET"
netlify env:set RESEND_API_KEY "re_c4xMnX9L_KiUKdRg5tWXsg22ai1Wnh9jJ" && echo "   ✅ RESEND_API_KEY"
netlify env:set FROM_EMAIL "contact@seoauditpro.net" && echo "   ✅ FROM_EMAIL"
netlify env:set DEEPSEEK_BASE_URL "https://api.deepseek.com" && echo "   ✅ DEEPSEEK_BASE_URL"
netlify env:set DEEPSEEK_API_KEY "sk-d889f3c892094cdaa8fbd892a542b581" && echo "   ✅ DEEPSEEK_API_KEY"
netlify env:set NEXT_PUBLIC_SITE_URL "https://seochecksite.netlify.app" && echo "   ✅ NEXT_PUBLIC_SITE_URL"

echo ""
echo "✅ All environment variables set!"
echo ""

# Step 5: Verify
echo "📋 Step 5: Verifying setup..."
netlify env:list

echo ""
echo "🎉 Netlify setup complete!"
echo ""
echo "📌 Next steps:"
echo "   1. Connect GitHub repo in Netlify dashboard (if not already connected)"
echo "   2. Set up Stripe webhook: https://seochecksite.netlify.app/api/webhooks/stripe"
echo "   3. Deploy: git push origin main (auto-deploys) or netlify deploy --prod"
echo ""

