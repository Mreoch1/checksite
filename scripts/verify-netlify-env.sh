#!/bin/bash
# Verify all required environment variables are set in Netlify

echo "🔍 Verifying Netlify Environment Variables"
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

# Required environment variables
REQUIRED_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "RESEND_API_KEY"
    "FROM_EMAIL"
    "DEEPSEEK_BASE_URL"
    "DEEPSEEK_API_KEY"
    "NEXT_PUBLIC_SITE_URL"
)

echo "Checking environment variables..."
echo ""

MISSING_VARS=()
EXISTING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    # Get value from Netlify
    value=$(netlify env:get "$var" 2>/dev/null)
    
    if [ -z "$value" ] || [ "$value" = "Not set" ] || [[ "$value" == *"YOUR_"* ]]; then
        MISSING_VARS+=("$var")
        echo "❌ $var - NOT SET or using placeholder"
    else
        EXISTING_VARS+=("$var")
        # Show first few chars
        masked_value="${value:0:10}...${value: -4}"
        echo "✅ $var - Set ($masked_value)"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    echo "✅ All environment variables are set!"
    echo ""
    echo "To view all: netlify env:list"
else
    echo "⚠️  Missing ${#MISSING_VARS[@]} environment variable(s):"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "To set them:"
    echo "   1. Use Netlify Dashboard: Site Settings → Environment Variables"
    echo "   2. Or use: ./scripts/set-netlify-env-only.sh (update with real keys first)"
    echo ""
    echo "See ENV_VARS_SETUP.md for where to get each key."
fi

