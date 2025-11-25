#!/bin/bash
# Create .env.local file for local development

echo "📝 Creating .env.local for local development"
echo ""

cd /Users/michaelreoch/sitecheck

if [ -f .env.local ]; then
    echo "⚠️  .env.local already exists!"
    read -p "Overwrite? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Cancelled"
        exit 1
    fi
fi

cat > .env.local << 'EOF'
# Local Development Environment Variables
# This file is gitignored - safe to use real keys here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ybliuezkxrlgiydbfzqy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibGl1ZXpreHJsZ2l5ZGJmenF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzI3ODUsImV4cCI6MjA3OTYwODc4NX0.Hkb_NEUSA7L6ITuL1zEePUHpHIcrvji0BVbfRbcYwtI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibGl1ZXpreHJsZ2l5ZGJmenF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDAzMjc4NSwiZXhwIjoyMDc5NjA4Nzg1fQ.DDyIJuCm_m2-nY0jCmvXInn8JPKP36VpyXP898hkN8g

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SXAll4OlWo66uf7qrTAcQQGGeXozYMSO5GsQb28fmBBXMsxaUOaHBcaVKKXrFvQyyVPL01YYtCg7RflPp9OHAqr00zjMhZE1w
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_278c5c756057a4a7d0c874a251c899c6707e6201e7702830e6265ca071ed9059

# Resend
RESEND_API_KEY=re_c4xMnX9L_KiUKdRg5tWXsg22ai1Wnh9jJ
FROM_EMAIL=contact@seoauditpro.net

# DeepSeek
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=sk-d889f3c892094cdaa8fbd892a542b581

# Site URL (local)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF

echo "✅ Created .env.local"
echo ""
echo "⚠️  This file is gitignored - your secrets are safe!"
echo ""
echo "To verify it's ignored: git status (should not show .env.local)"

