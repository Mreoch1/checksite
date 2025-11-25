#!/bin/bash

echo "🚀 Initializing Git and Pushing to GitHub"
echo "=========================================="
echo ""

cd /Users/michaelreoch/sitecheck

# Initialize git if needed
if [ ! -d .git ]; then
    echo "Initializing git repository..."
    git init
    echo "✅ Git initialized"
else
    echo "✅ Git repository already exists"
fi

# Add all files
echo ""
echo "Adding all files..."
git add -A

# Show what will be committed
echo ""
echo "Files to be committed:"
git status --short | head -20

# Commit
echo ""
echo "Committing..."
git commit -m "Initial commit: SiteCheck SEO audit web app"
echo "✅ Committed"

# Set branch to main
echo ""
echo "Setting branch to main..."
git branch -M main
echo "✅ Branch set to main"

# Add remote
echo ""
echo "Setting up remote..."
git remote remove origin 2>/dev/null
git remote add origin https://github.com/Mreoch1/checksite.git
echo "✅ Remote added: https://github.com/Mreoch1/checksite.git"

# Push
echo ""
echo "Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "Repository: https://github.com/Mreoch1/checksite"
    echo ""
    echo "Now go back to Netlify and refresh - the repository should be detected!"
else
    echo ""
    echo "❌ Push failed. You may need to authenticate."
    echo ""
    echo "Try:"
    echo "  gh auth login"
    echo "  git push -u origin main"
fi

