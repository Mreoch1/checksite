#!/bin/bash
set -e

echo "🔄 Resetting Git History and Pushing Clean Repository"
echo ""

cd /Users/michaelreoch/sitecheck

# Remove old git history
echo "1. Removing old git repository..."
rm -rf .git

# Initialize fresh git repo
echo "2. Initializing fresh git repository..."
git init
git branch -M main

# Verify files are clean (no actual secrets - check for placeholder instead)
echo "3. Verifying files use placeholders..."
if ! grep -q "YOUR_STRIPE_SECRET_KEY" scripts/set-all-netlify-env.sh scripts/set-netlify-env.sh NETLIFY_DEPLOY.md 2>/dev/null; then
    echo "⚠️  Warning: Placeholders may not be set correctly"
fi

# Stage all files
echo "4. Staging all files..."
git add -A

# Create initial commit
echo "5. Creating initial commit..."
git commit -m "Initial commit: SiteCheck SEO audit web app"

# Add remote
echo "6. Setting up remote..."
git remote add origin https://github.com/Mreoch1/checksite.git 2>/dev/null || git remote set-url origin https://github.com/Mreoch1/checksite.git

# Force push
echo "7. Force pushing to GitHub..."
git push -f origin main

echo ""
echo "✅ Successfully pushed clean repository!"
echo "Repository: https://github.com/Mreoch1/checksite"

