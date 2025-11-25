# How to Get Inngest Credentials

## Step-by-Step Guide

### 1. Sign Up / Login to Inngest

1. Go to **https://www.inngest.com**
2. Click **"Sign Up"** (or **"Log In"** if you already have an account)
3. You can sign up with:
   - Email
   - GitHub
   - Google

### 2. Create an App

1. After logging in, you'll see the onboarding guide
2. Follow **Step 1: Create an Inngest app**
3. Or go to **"Apps"** in the left sidebar
4. Click **"Create App"** or **"New App"**
5. Give it a name (e.g., "SEO CheckSite")
6. Click **"Create"**

### 3. Get Your Credentials

Once your app is created, you'll find your credentials in the app settings:

#### Option A: From App Settings
1. Go to **"Apps"** in the left sidebar
2. Click on your app
3. Go to **"Settings"** or **"Configuration"**
4. You'll see:
   - **App ID** (or **App Slug**)
   - **Event Key** (or **Event Signing Key**)
   - **Signing Key** (or **Function Signing Key**)

#### Option B: From Environment Variables
1. In your app settings
2. Look for **"Environment Variables"** or **"Keys"** section
3. You'll see:
   - `INNGEST_APP_ID`
   - `INNGEST_EVENT_KEY`
   - `INNGEST_SIGNING_KEY`

#### Option C: From Dev Server (Local)
If you're running the Inngest dev server locally:
1. Open `http://localhost:8288`
2. Go to **"Settings"**
3. Look for **"App Configuration"**
4. Credentials should be displayed there

### 4. What Each Credential Is

- **App ID**: Identifies your Inngest app (e.g., `seo-checksite`)
- **Event Key**: Used to authenticate events sent to Inngest
- **Signing Key**: Used to verify function requests from Inngest

## Quick Visual Guide

```
Inngest Dashboard
├── Apps (left sidebar)
│   └── Your App Name
│       ├── Settings / Configuration
│       │   ├── App ID: "your-app-id"
│       │   ├── Event Key: "signkey-xxx"
│       │   └── Signing Key: "signkey-yyy"
│       └── Environment Variables
│           └── Shows all keys
```

## Alternative: Check Dev Server

If you're running the Inngest dev server locally:

1. Open `http://localhost:8288`
2. The dev server may show your app configuration
3. Or check the terminal where you ran `npx inngest-cli@latest dev`

## After Getting Credentials

Once you have them, set them in Netlify:

```bash
./setup-inngest-complete.sh
```

Or manually:
```bash
netlify env:set INNGEST_APP_ID=your_app_id_here
netlify env:set INNGEST_EVENT_KEY=your_event_key_here
netlify env:set INNGEST_SIGNING_KEY=your_signing_key_here
```

## Troubleshooting

### Can't Find Credentials?

1. **Check if app is created:**
   - Go to "Apps" in Inngest dashboard
   - Make sure you have at least one app

2. **Check app settings:**
   - Click on your app
   - Look for "Settings", "Configuration", or "Keys"

3. **For local dev:**
   - Credentials are optional for local development
   - Dev server handles authentication automatically

### Still Having Issues?

- Check Inngest documentation: https://www.inngest.com/docs
- Contact Inngest support
- Check the Inngest dashboard help section

