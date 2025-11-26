#!/bin/bash
# Script to set all Netlify environment variables
# Usage: ./netlify-env-setup.sh

# Make sure you're logged into Netlify CLI
# Run: netlify login

echo "Setting Netlify environment variables..."
echo ""

# Supabase
echo "Setting Supabase variables..."
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://your-project.supabase.co" --context production
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "your_supabase_anon_key_here" --context production

# Stripe
echo "Setting Stripe variables..."
netlify env:set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY "pk_live_your_publishable_key_here" --context production
netlify env:set STRIPE_SECRET_KEY "sk_live_your_secret_key_here" --context production
netlify env:set STRIPE_WEBHOOK_SECRET "whsec_your_webhook_secret_here" --context production

# SendGrid (Email)
echo "Setting SendGrid variables..."
netlify env:set SENDGRID_API_KEY "SG.your_sendgrid_api_key_here" --context production
netlify env:set FROM_EMAIL "contact@seoauditpro.net" --context production
netlify env:set FROM_NAME "SEO CheckSite" --context production

# DeepSeek
echo "Setting DeepSeek variables..."
netlify env:set DEEPSEEK_BASE_URL "https://api.deepseek.com" --context production
netlify env:set DEEPSEEK_API_KEY "sk-your_deepseek_api_key_here" --context production

# Site Configuration
echo "Setting site configuration..."
netlify env:set NEXT_PUBLIC_SITE_URL "https://seochecksite.netlify.app" --context production

# Admin & Queue (Optional)
echo "Setting admin/queue secrets..."
netlify env:set ADMIN_SECRET "your_admin_secret_key_here" --context production
netlify env:set QUEUE_SECRET "your_queue_secret_key_here" --context production

echo ""
echo "✅ All environment variables set!"
echo ""
echo "⚠️  IMPORTANT: Replace all placeholder values with your actual keys!"
echo "   Edit this script and replace 'your_*_here' with real values, then run again."

