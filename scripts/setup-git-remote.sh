#!/bin/bash

echo "🔗 Setting up Git Remote"
echo ""

REPO_NAME="checksite"

echo "Repository name: $REPO_NAME"
echo ""
echo "Which Git provider?"
echo "1) GitHub"
echo "2) GitLab"
echo "3) Bitbucket"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
  1)
    read -p "Enter your GitHub username: " username
    REMOTE_URL="https://github.com/${username}/${REPO_NAME}.git"
    SSH_URL="git@github.com:${username}/${REPO_NAME}.git"
    ;;
  2)
    read -p "Enter your GitLab username: " username
    REMOTE_URL="https://gitlab.com/${username}/${REPO_NAME}.git"
    SSH_URL="git@gitlab.com:${username}/${REPO_NAME}.git"
    ;;
  3)
    read -p "Enter your Bitbucket username: " username
    REMOTE_URL="https://bitbucket.org/${username}/${REPO_NAME}.git"
    SSH_URL="git@bitbucket.org:${username}/${REPO_NAME}.git"
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo ""
read -p "Use SSH? (y/n) [n]: " use_ssh

if [[ $use_ssh =~ ^[Yy]$ ]]; then
  FINAL_URL=$SSH_URL
else
  FINAL_URL=$REMOTE_URL
fi

echo ""
echo "Adding remote: $FINAL_URL"
git remote add origin $FINAL_URL 2>/dev/null || git remote set-url origin $FINAL_URL

echo "✅ Remote added"
echo ""
echo "Pushing to remote..."
git push -u origin main

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Successfully pushed to $FINAL_URL"
else
  echo ""
  echo "❌ Push failed. Make sure:"
  echo "   1. Repository exists on your Git provider"
  echo "   2. You have access/permissions"
  echo "   3. Repository is empty (no README, .gitignore, etc.)"
fi

