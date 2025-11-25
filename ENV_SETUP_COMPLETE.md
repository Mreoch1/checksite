# Environment Variables Setup - Complete Guide

## ✅ Best Practices Implemented

### 1. Local Development (`.env.local`)
- ✅ **Gitignored** - Never committed to git
- ✅ Contains your actual API keys
- ✅ Safe to use real secrets locally

### 2. Production (Netlify)
- ✅ Stored securely in Netlify Dashboard
- ✅ Never committed to git
- ✅ Accessible only through Netlify's secure system

### 3. Template (`.env.example`)
- ✅ Committed to git with placeholders
- ✅ Safe to share publicly
- ✅ Shows what variables are needed

## 🚀 Quick Setup

### Step 1: Create Local Environment File
```bash
# Creates .env.local with your actual keys (gitignored)
./scripts/create-local-env.sh
```

### Step 2: Set Netlify Environment Variables

**Option A: Using Secure Script (Recommended)**
```bash
# Reads from .env.local or prompts for values
./scripts/set-netlify-env-secure.sh
```

**Option B: Manual via Dashboard**
1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Add each variable manually
3. See `ENV_VARS_SETUP.md` for values

**Option C: Using Script with Hardcoded Values**
```bash
# Update scripts/set-all-netlify-env-final.sh with your keys first
./scripts/set-all-netlify-env-final.sh
```

### Step 3: Verify Setup
```bash
# Check all Netlify env vars are set
./scripts/verify-netlify-env.sh
```

## 📋 Required Environment Variables

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Stripe
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Resend
- `RESEND_API_KEY`
- `FROM_EMAIL`

### DeepSeek
- `DEEPSEEK_BASE_URL`
- `DEEPSEEK_API_KEY`

### Site
- `NEXT_PUBLIC_SITE_URL`

## 🔒 Security Checklist

- ✅ `.env.local` is gitignored
- ✅ `.env` is gitignored
- ✅ No secrets in committed files
- ✅ All production secrets in Netlify Dashboard
- ✅ `.env.example` uses placeholders only

## 📝 Files Overview

| File | Purpose | Git Status |
|------|---------|------------|
| `.env.local` | Local dev secrets | ❌ Gitignored |
| `.env.example` | Template with placeholders | ✅ Committed |
| `scripts/set-netlify-env-secure.sh` | Set Netlify vars securely | ✅ Committed |
| `scripts/verify-netlify-env.sh` | Verify Netlify vars | ✅ Committed |
| `scripts/create-local-env.sh` | Create local env file | ✅ Committed |

## ✅ Verification

After setting up, verify everything:

```bash
# 1. Check .env.local is gitignored
git status | grep .env.local
# Should return nothing (file is ignored)

# 2. Verify Netlify env vars
./scripts/verify-netlify-env.sh

# 3. View all Netlify vars
netlify env:list
```

## 🎯 Summary

**Best Practice Setup:**
- ✅ Local secrets in `.env.local` (gitignored)
- ✅ Production secrets in Netlify Dashboard
- ✅ Template in `.env.example` (committed)
- ✅ Scripts to manage both securely

Your setup follows industry best practices! 🎉

