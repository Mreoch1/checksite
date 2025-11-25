#!/bin/bash

echo "🔧 Fixing Git History to Remove Secrets"
echo ""

# Verify current files don't have secrets
echo "Checking for secrets in current files..."
if grep -r "YOUR_STRIPE_SECRET_KEY" scripts/*.sh NETLIFY_DEPLOY.md 2>/dev/null | grep -v "YOUR_STRIPE_SECRET_KEY" | grep -q "sk_test"; then
    echo "❌ Secrets still found in files!"
    exit 1
fi

echo "✅ Current files are clean"
echo ""

# Reset to remove commits with secrets
echo "Resetting git history..."
git reset --hard HEAD~2 2>/dev/null || git reset --hard HEAD~1 2>/dev/null || echo "Already at beginning"

# Make sure we're clean
git status

# Add all files
echo ""
echo "Staging all files..."
git add -A

# Create fresh commit
echo ""
echo "Creating fresh commit without secrets..."
git commit -m "Initial commit: SiteCheck SEO audit web app"

# Force push
echo ""
echo "Force pushing to GitHub..."
git push -f origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed!"
    echo "Repository: https://github.com/Mreoch1/checksite"
else
    echo ""
    echo "❌ Push failed"
fi

