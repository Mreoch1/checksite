#!/bin/bash
# Add missing SendGrid DNS records to Netlify DNS for seochecksite.net
# Requires: netlify-cli installed and authenticated

set -e

DOMAIN="seochecksite.net"

echo "=========================================="
echo "Adding SendGrid DNS Records to Netlify"
echo "Domain: $DOMAIN"
echo "=========================================="
echo ""

# Check if netlify CLI is installed
if ! command -v netlify &> /dev/null; then
  echo "❌ Netlify CLI is not installed"
  echo "   Install it with: npm install -g netlify-cli"
  exit 1
fi

# Check if logged in
if ! netlify status &> /dev/null; then
  echo "⚠️  Not logged into Netlify. Logging in..."
  netlify login
fi

echo "Adding missing SendGrid CNAME records..."
echo ""

# Add url5121 CNAME
echo "1. Adding url5121 CNAME record..."
netlify dns:add url5121.$DOMAIN CNAME sendgrid.net --ttl 3600 || {
  echo "   ⚠️  Record may already exist or there was an error"
}

# Add 51760082 CNAME
echo "2. Adding 51760082 CNAME record..."
netlify dns:add 51760082.$DOMAIN CNAME sendgrid.net --ttl 3600 || {
  echo "   ⚠️  Record may already exist or there was an error"
}

# Add em1811 CNAME
echo "3. Adding em1811 CNAME record..."
netlify dns:add em1811.$DOMAIN CNAME u51760082.wl083.sendgrid.net --ttl 3600 || {
  echo "   ⚠️  Record may already exist or there was an error"
}

echo ""
echo "=========================================="
echo "Verification"
echo "=========================================="
echo ""
echo "Checking DNS records..."
echo ""

# Function to check DNS record
check_record() {
  local record_type=$1
  local record_name=$2
  local expected=$3
  
  echo -n "Checking $record_type $record_name... "
  result=$(dig +short $record_type "$record_name" 2>/dev/null | head -1)
  
  if [ -z "$result" ]; then
    echo "❌ NOT FOUND"
    return 1
  else
    echo "✅ FOUND: $result"
    if [ -n "$expected" ] && [[ "$result" == *"$expected"* ]]; then
      echo "   ✓ Contains expected value"
    fi
    return 0
  fi
}

# Check all SendGrid records
check_record "CNAME" "url5121.$DOMAIN" "sendgrid.net"
check_record "CNAME" "51760082.$DOMAIN" "sendgrid.net"
check_record "CNAME" "em1811.$DOMAIN" "sendgrid.net"
check_record "CNAME" "s1._domainkey.$DOMAIN" "domainkey"
check_record "CNAME" "s2._domainkey.$DOMAIN" "domainkey"

# Check SPF
check_record "TXT" "$DOMAIN" "v=spf1 include:sendgrid.net"

# Check DMARC
check_record "TXT" "_dmarc.$DOMAIN" "DMARC1"

echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo "1. Wait 5-60 minutes for DNS propagation"
echo "2. Verify records in Netlify Dashboard:"
echo "   https://app.netlify.com/teams/mreoch1/dns/$DOMAIN"
echo "3. Check SendGrid Dashboard to confirm all records are verified"
echo "4. Run this script again to verify records are propagating"
echo ""

