#!/bin/bash
# Set all environment variables to Netlify
# 
# Usage:
#   1. Login: netlify login
#   2. Run: ./scripts/set-all-netlify-env.sh

set -e

echo "📦 Setting environment variables to Netlify..."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local file not found"
  exit 1
fi

# Check if logged in
if ! netlify status &>/dev/null; then
  echo "❌ Error: Not logged in to Netlify"
  echo "   Run: netlify login"
  exit 1
fi

# Counter for tracking
count=0
skipped=0

# Read .env.local and set variables
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  
  # Remove quotes from value if present
  value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
  
  # Skip if value is empty
  [[ -z "$value" ]] && continue
  
  # Skip localhost URLs for production
  if [[ "$key" == "NEXT_PUBLIC_SITE_URL" ]] && [[ "$value" == *"localhost"* ]]; then
    echo "⏭️  Skipping $key (localhost value - will set production value)"
    ((skipped++))
    continue
  fi
  
  # Skip placeholder values
  if [[ "$value" == *"placeholder"* ]] || [[ "$value" == *"test"* ]] && [[ "$key" == *"SECRET"* ]] || [[ "$key" == *"KEY"* ]]; then
    echo "⏭️  Skipping $key (placeholder/test value)"
    ((skipped++))
    continue
  fi
  
  echo "Setting $key..."
  if netlify env:set "$key" "$value" --context production 2>&1 | grep -qE "(Updated|Set|already exists)"; then
    echo "  ✅ Set"
    ((count++))
  else
    echo "  ⚠️  May have failed - check output above"
  fi
done < .env.local

# Set production-specific overrides
echo ""
echo "🔧 Setting production overrides..."
netlify env:set FROM_EMAIL "admin@seochecksite.net" --context production && ((count++))
netlify env:set NEXT_PUBLIC_SITE_URL "https://seochecksite.net" --context production && ((count++))
netlify env:set FROM_NAME "SEO CheckSite" --context production && ((count++))

# Set email provider defaults if not in .env.local
echo ""
if ! grep -q "^SENDGRID_API_KEY=" .env.local 2>/dev/null; then
  echo "⚠️  SENDGRID_API_KEY not found in .env.local"
  echo "   Set it manually with: netlify env:set SENDGRID_API_KEY 'your-key' --context production"
fi

if ! grep -q "^SMTP_PASSWORD=" .env.local 2>/dev/null; then
  echo "⚠️  SMTP_PASSWORD not found in .env.local"
  echo "   Set it manually with: netlify env:set SMTP_PASSWORD 'your-password' --context production"
fi

echo ""
echo "✅ Set $count environment variables (skipped $skipped)"
echo ""
echo "📋 Verify with: netlify env:list"
