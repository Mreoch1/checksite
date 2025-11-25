#!/bin/bash
# Secure script to set Netlify environment variables
# Reads from .env.local (which is gitignored) or prompts for values

set -e

echo "🔐 Setting Netlify Environment Variables Securely"
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

# Function to get env var from .env.local or prompt
get_env_var() {
    local var_name=$1
    local prompt_text=$2
    
    # Try to read from .env.local
    if [ -f .env.local ]; then
        local value=$(grep "^${var_name}=" .env.local 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
        if [ -n "$value" ]; then
            echo "$value"
            return
        fi
    fi
    
    # Prompt for value
    read -p "$prompt_text: " value
    echo "$value"
}

echo "Reading values from .env.local (if exists) or prompting..."
echo ""

# Supabase
SUPABASE_URL=$(get_env_var "NEXT_PUBLIC_SUPABASE_URL" "Supabase URL")
SUPABASE_ANON_KEY=$(get_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "Supabase Anon Key")
SUPABASE_SERVICE_KEY=$(get_env_var "SUPABASE_SERVICE_ROLE_KEY" "Supabase Service Role Key")

# Stripe
STRIPE_PUB_KEY=$(get_env_var "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "Stripe Publishable Key")
STRIPE_SECRET=$(get_env_var "STRIPE_SECRET_KEY" "Stripe Secret Key")
STRIPE_WEBHOOK=$(get_env_var "STRIPE_WEBHOOK_SECRET" "Stripe Webhook Secret")

# Resend
RESEND_KEY=$(get_env_var "RESEND_API_KEY" "Resend API Key")
FROM_EMAIL_VAL=$(get_env_var "FROM_EMAIL" "From Email")

# DeepSeek
DEEPSEEK_URL=$(get_env_var "DEEPSEEK_BASE_URL" "DeepSeek Base URL")
DEEPSEEK_KEY=$(get_env_var "DEEPSEEK_API_KEY" "DeepSeek API Key")

# Site URL
SITE_URL=$(get_env_var "NEXT_PUBLIC_SITE_URL" "Site URL (e.g., https://seochecksite.netlify.app)")

echo ""
echo "Setting environment variables in Netlify..."
echo ""

netlify env:set NEXT_PUBLIC_SUPABASE_URL "$SUPABASE_URL" && echo "✅ NEXT_PUBLIC_SUPABASE_URL"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "$SUPABASE_ANON_KEY" && echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_KEY" && echo "✅ SUPABASE_SERVICE_ROLE_KEY"
netlify env:set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY "$STRIPE_PUB_KEY" && echo "✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
netlify env:set STRIPE_SECRET_KEY "$STRIPE_SECRET" && echo "✅ STRIPE_SECRET_KEY"
netlify env:set STRIPE_WEBHOOK_SECRET "$STRIPE_WEBHOOK" && echo "✅ STRIPE_WEBHOOK_SECRET"
netlify env:set RESEND_API_KEY "$RESEND_KEY" && echo "✅ RESEND_API_KEY"
netlify env:set FROM_EMAIL "$FROM_EMAIL_VAL" && echo "✅ FROM_EMAIL"
netlify env:set DEEPSEEK_BASE_URL "$DEEPSEEK_URL" && echo "✅ DEEPSEEK_BASE_URL"
netlify env:set DEEPSEEK_API_KEY "$DEEPSEEK_KEY" && echo "✅ DEEPSEEK_API_KEY"
netlify env:set NEXT_PUBLIC_SITE_URL "$SITE_URL" && echo "✅ NEXT_PUBLIC_SITE_URL"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All environment variables set in Netlify!"
echo ""
echo "To verify: ./scripts/verify-netlify-env.sh"
echo "To view all: netlify env:list"

