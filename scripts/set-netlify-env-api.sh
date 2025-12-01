#!/bin/bash
# Set environment variables to Netlify using API
# 
# Usage:
#   export NETLIFY_AUTH_TOKEN="your-token"
#   ./scripts/set-netlify-env-api.sh
#
# Get token from: https://app.netlify.com/user/applications#personal-access-tokens

set -e

SITE_ID="f46dd225-aca2-452e-863c-a91d52b9ebf9"
API_URL="https://api.netlify.com/api/v1"

if [ -z "$NETLIFY_AUTH_TOKEN" ]; then
  echo "❌ Error: NETLIFY_AUTH_TOKEN not set"
  echo ""
  echo "Get a token from: https://app.netlify.com/user/applications#personal-access-tokens"
  echo "Then run: export NETLIFY_AUTH_TOKEN='your-token' && ./scripts/set-netlify-env-api.sh"
  exit 1
fi

if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local file not found"
  exit 1
fi

echo "📦 Setting environment variables to Netlify via API..."
echo ""

count=0
skipped=0

# Function to set env var via API
set_env_var() {
  local key="$1"
  local value="$2"
  
  # URL encode the value
  local encoded_value=$(printf '%s' "$value" | jq -sRr @uri)
  
  local response=$(curl -s -w "\n%{http_code}" -X POST \
    "$API_URL/sites/$SITE_ID/env" \
    -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"$key\",\"values\":[{\"value\":\"$value\",\"context\":\"production\"}]}")
  
  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
    echo "  ✅ Set $key"
    return 0
  else
    echo "  ⚠️  Failed to set $key (HTTP $http_code)"
    echo "     Response: $body"
    return 1
  fi
}

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
    echo "⏭️  Skipping $key (localhost value)"
    ((skipped++))
    continue
  fi
  
  # Skip placeholder values
  if [[ "$value" == *"placeholder"* ]] && [[ "$key" == *"SECRET"* ]] || [[ "$key" == *"KEY"* ]]; then
    echo "⏭️  Skipping $key (placeholder value)"
    ((skipped++))
    continue
  fi
  
  echo "Setting $key..."
  if set_env_var "$key" "$value"; then
    ((count++))
  fi
done < .env.local

# Set production-specific overrides
echo ""
echo "🔧 Setting production overrides..."
set_env_var "FROM_EMAIL" "admin@seochecksite.net" && ((count++))
set_env_var "NEXT_PUBLIC_SITE_URL" "https://seochecksite.net" && ((count++))
set_env_var "FROM_NAME" "SEO CheckSite" && ((count++))

echo ""
echo "✅ Set $count environment variables (skipped $skipped)"
echo ""
echo "📋 Verify at: https://app.netlify.com/sites/seochecksite/configuration/env"

