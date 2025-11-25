#!/bin/bash

echo "🚀 Pushing to GitHub repository: checksite"
echo ""

# Check if repository exists locally
if [ ! -d .git ]; then
    echo "Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit: SiteCheck SEO audit web app"
    git branch -M main
fi

# Try GitHub CLI first
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI found"
    echo "Creating repository and pushing..."
    gh repo create checksite --public --source=. --remote=origin --push
    if [ $? -eq 0 ]; then
        echo "✅ Successfully pushed to GitHub!"
        exit 0
    fi
fi

# Fallback: Manual setup
echo "Using manual git setup..."
echo ""

# Remove existing remote if any
git remote remove origin 2>/dev/null

# Try to get GitHub username
GITHUB_USER=$(git config user.name 2>/dev/null || echo "")

if [ -z "$GITHUB_USER" ]; then
    read -p "Enter your GitHub username: " GITHUB_USER
fi

REMOTE_URL="https://github.com/${GITHUB_USER}/checksite.git"

echo "Adding remote: $REMOTE_URL"
git remote add origin $REMOTE_URL

echo "Pushing to origin main..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "Repository: $REMOTE_URL"
else
    echo ""
    echo "❌ Push failed. Make sure:"
    echo "   1. Repository 'checksite' exists on GitHub"
    echo "   2. Repository is empty (no README, .gitignore, etc.)"
    echo "   3. You have push access"
    echo ""
    echo "Create repository at: https://github.com/new"
    echo "Name: checksite"
    echo "Don't initialize with README, .gitignore, or license"
fi

