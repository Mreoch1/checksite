#!/bin/bash

echo "🚀 Netlify Deployment Script"
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
    exit 1
fi

echo "✅ Site linked"
echo ""

# Build
echo "📦 Building..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"
echo ""

# Deploy
echo "🚀 Deploying to Netlify..."
read -p "Deploy to production? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    netlify deploy --prod
else
    netlify deploy
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Update NEXT_PUBLIC_SITE_URL in Netlify env vars"
echo "   2. Configure Stripe webhook for production URL"
echo "   3. Update STRIPE_WEBHOOK_SECRET in Netlify env vars"

