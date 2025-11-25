#!/bin/bash
# Link Netlify site and set all environment variables

set -e

cd /Users/michaelreoch/sitecheck

echo "🔗 Linking Netlify Site"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI not found. Install with: npm install -g netlify-cli"
    exit 1
fi

# Check if already linked
if [ -f .netlify/state.json ]; then
    echo "✅ Site already linked"
    netlify status
else
    echo "Linking to site: seochecksite"
    netlify link --name seochecksite || {
        echo "⚠️  Could not link by name. Please select from list:"
        netlify link
    }
fi

echo ""
echo "🔧 Setting Environment Variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Supabase
netlify env:set --force NEXT_PUBLIC_SUPABASE_URL "${NEXT_PUBLIC_SUPABASE_URL:-YOUR_SUPABASE_URL}" && echo "✅ NEXT_PUBLIC_SUPABASE_URL"
netlify env:set --force NEXT_PUBLIC_SUPABASE_ANON_KEY "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-YOUR_SUPABASE_ANON_KEY}" && echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY"
netlify env:set --force SUPABASE_SERVICE_ROLE_KEY "${SUPABASE_SERVICE_ROLE_KEY:-YOUR_SUPABASE_SERVICE_ROLE_KEY}" && echo "✅ SUPABASE_SERVICE_ROLE_KEY"

# Stripe
netlify env:set --force NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY "${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-YOUR_STRIPE_PUBLISHABLE_KEY}" && echo "✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
netlify env:set --force STRIPE_SECRET_KEY "${STRIPE_SECRET_KEY:-YOUR_STRIPE_SECRET_KEY}" && echo "✅ STRIPE_SECRET_KEY"
netlify env:set --force STRIPE_WEBHOOK_SECRET "${STRIPE_WEBHOOK_SECRET:-YOUR_STRIPE_WEBHOOK_SECRET}" && echo "✅ STRIPE_WEBHOOK_SECRET"

# Resend
netlify env:set --force RESEND_API_KEY "${RESEND_API_KEY:-YOUR_RESEND_API_KEY}" && echo "✅ RESEND_API_KEY"
netlify env:set --force FROM_EMAIL "${FROM_EMAIL:-YOUR_FROM_EMAIL}" && echo "✅ FROM_EMAIL"

# DeepSeek
netlify env:set --force DEEPSEEK_BASE_URL "${DEEPSEEK_BASE_URL:-https://api.deepseek.com}" && echo "✅ DEEPSEEK_BASE_URL"
netlify env:set --force DEEPSEEK_API_KEY "${DEEPSEEK_API_KEY:-YOUR_DEEPSEEK_API_KEY}" && echo "✅ DEEPSEEK_API_KEY"

# Site URL
netlify env:set --force NEXT_PUBLIC_SITE_URL "https://seochecksite.netlify.app" && echo "✅ NEXT_PUBLIC_SITE_URL"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All environment variables set!"
echo ""
echo "Verifying..."
netlify env:list

