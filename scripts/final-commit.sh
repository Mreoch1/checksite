#!/bin/bash
# Final commit script - run this manually in your terminal

set -e

cd /Users/michaelreoch/sitecheck

echo "🔍 Checking Git Status..."
echo ""
git status --short

echo ""
echo "📝 Staging all files..."
git add -A

echo ""
echo "📋 Files to commit:"
git status --short

echo ""
echo "💾 Committing all changes..."
read -p "Enter commit message (or press Enter for default): " commit_msg
commit_msg=${commit_msg:-"Update project files"}
git commit -m "$commit_msg" || {
    echo "⚠️  No changes to commit (everything already committed)"
}

echo ""
echo "🚀 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Successfully pushed to GitHub!"
echo ""
echo "Repository: https://github.com/Mreoch1/checksite"
echo ""
echo "Netlify should now rebuild automatically."

