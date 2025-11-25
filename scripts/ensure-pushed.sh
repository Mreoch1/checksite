#!/bin/bash

echo "🔍 Ensuring all files are committed and pushed to GitHub"
echo ""

# Check git status
echo "Checking git status..."
git status --short

# Add all files
echo ""
echo "Adding all files..."
git add -A

# Check what will be committed
echo ""
echo "Files to be committed:"
git status --short

# Commit
echo ""
read -p "Commit these changes? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    git commit -m "Ensure all files committed for Netlify deployment"
    echo "✅ Committed"
    
    # Push
    echo ""
    echo "Pushing to GitHub..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Successfully pushed to GitHub!"
        echo ""
        echo "Repository: https://github.com/Mreoch1/checksite"
        echo ""
        echo "Now go back to Netlify and refresh the page."
        echo "The repository should be detected properly."
    else
        echo ""
        echo "❌ Push failed. Check your git credentials."
    fi
else
    echo "Skipped commit"
fi

