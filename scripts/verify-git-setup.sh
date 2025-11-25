#!/bin/bash

echo "🔍 Verifying Git Setup"
echo "====================="
echo ""

# Check current directory
echo "Current directory: $(pwd)"
echo ""

# Check git remote
echo "Git Remote:"
git remote -v
echo ""

# Verify remote URL
REMOTE_URL=$(git remote get-url origin 2>/dev/null)
if [[ $REMOTE_URL == *"checksite"* ]]; then
    echo "✅ Git remote correctly points to 'checksite' repository"
else
    echo "⚠️  Git remote may be incorrect"
    echo "   Current: $REMOTE_URL"
    echo "   Should be: https://github.com/Mreoch1/checksite.git"
    echo ""
    echo "Fixing..."
    git remote set-url origin https://github.com/Mreoch1/checksite.git
    echo "✅ Updated"
fi

echo ""
echo "Current branch: $(git branch --show-current)"
echo ""

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  There are uncommitted changes:"
    git status --short
    echo ""
    echo "Run these commands to commit and push:"
    echo "  git add -A"
    echo "  git commit -m 'Update for Netlify'"
    echo "  git push origin main"
else
    echo "✅ No uncommitted changes"
fi

echo ""
echo "Latest commit:"
git log --oneline -1

echo ""
echo "Repository URL: https://github.com/Mreoch1/checksite"
echo ""
echo "✅ Git setup verified!"

