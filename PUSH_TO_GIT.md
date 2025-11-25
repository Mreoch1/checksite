# Push to Git Repository

## ✅ Git Repository Initialized

Your code has been committed locally. Now you need to push to a remote repository.

## Step 1: Create a Repository

Create a new repository on:
- **GitHub**: https://github.com/new
- **GitLab**: https://gitlab.com/projects/new
- **Bitbucket**: https://bitbucket.org/repo/create

**Important**: Don't initialize with README, .gitignore, or license (we already have these)

## Step 2: Add Remote and Push

After creating the repository, run:

```bash
# Add your remote (replace with your actual repo URL)
git remote add origin https://github.com/yourusername/sitecheck.git

# Or if using SSH:
git remote add origin git@github.com:yourusername/sitecheck.git

# Push to remote
git push -u origin main
```

## Quick Commands

```bash
# Check status
git status

# See commits
git log --oneline

# Add remote (replace URL)
git remote add origin <your-repo-url>

# Push
git push -u origin main
```

## What's Included

✅ All source code
✅ Configuration files (netlify.toml, etc.)
✅ Documentation
✅ Scripts

## What's Excluded (.gitignore)

❌ node_modules
❌ .env.local (sensitive keys)
❌ .next (build files)
❌ .netlify (deployment files)

## After Pushing

1. Connect to Netlify:
   - Go to https://app.netlify.com
   - Add new site → Import from Git
   - Select your repository
   - Configure environment variables
   - Deploy!

## Environment Variables Reminder

Don't forget to add all environment variables in Netlify dashboard:
- All variables from `.env.local` (except the file itself)
- Update `NEXT_PUBLIC_SITE_URL` after deployment

