# Scripts Directory

Helper scripts for development and deployment.

## Setup Scripts

- **`setup.sh`** - Main setup script (installs dependencies, creates .env.local)
- **`create-local-env.sh`** - Creates `.env.local` from template
- **`setup-stripe-webhook.sh`** - Sets up Stripe webhook for local development
- **`setup-git-remote.sh`** - Configures Git remote repository

## Netlify Scripts

- **`deploy-netlify.sh`** - Deploys to Netlify
- **`set-netlify-env-secure.sh`** - Sets Netlify environment variables (reads from `.env.local` or prompts)
- **`set-all-netlify-env-final.sh`** - Template for setting all Netlify env vars (update with your keys)
- **`netlify-setup-complete.sh`** - Complete Netlify setup (one-time use)
- **`verify-netlify-env.sh`** - Verifies Netlify environment variables are set

## Git Scripts

- **`final-commit.sh`** - Commits and pushes changes to GitHub
- **`verify-git-setup.sh`** - Verifies Git remote is configured

## Utility Scripts

- **`get-webhook-secret.sh`** - Gets Stripe webhook secret from CLI

## Usage

All scripts are executable. Run them from the project root:

```bash
./scripts/script-name.sh
```

Or make them executable if needed:

```bash
chmod +x scripts/script-name.sh
```

