#!/bin/bash
# DNS Records Setup Script for seochecksite.net
# This script documents the required DNS records and provides verification commands
# Note: DNS records must be added through Network Solutions web interface or API

set -e

DOMAIN="seochecksite.net"

echo "=========================================="
echo "DNS Records Setup for $DOMAIN"
echo "=========================================="
echo ""
echo "⚠️  IMPORTANT: DNS records must be added through Network Solutions"
echo "   This script only provides the records to add and verification commands."
echo ""
echo "=========================================="
echo "REQUIRED DNS RECORDS TO ADD:"
echo "=========================================="
echo ""

echo "1. SPF Record (TXT) - CRITICAL for email deliverability"
echo "   Type: TXT"
echo "   Name/Host: @ (or leave blank for root domain)"
echo "   Value: v=spf1 include:sendgrid.net ~all"
echo "   TTL: 3600"
echo ""

echo "2. SendGrid CNAME Records"
echo "   CNAME: url5121 → sendgrid.net"
echo "   CNAME: 51760082 → sendgrid.net"
echo "   CNAME: em1811 → u51760082.wl083.sendgrid.net"
echo "   CNAME: s1._domainkey → s1.domainkey.u51760082.wl083.sendgrid.net"
echo "   CNAME: s2._domainkey → s2.domainkey.u51760082.wl083.sendgrid.net"
echo ""

echo "3. DMARC Record (TXT) - Update existing"
echo "   Type: TXT"
echo "   Name/Host: _dmarc"
echo "   Current Value: v=DMARC1; p=none; rua=mailto:contact@seochecksite.net"
echo "   Recommended Value: v=DMARC1; p=quarantine; rua=mailto:contact@seochecksite.net; ruf=mailto:contact@seochecksite.net"
echo ""

echo "=========================================="
echo "HOW TO ADD RECORDS IN NETWORK SOLUTIONS:"
echo "=========================================="
echo ""
echo "1. Log into Network Solutions: https://www.networksolutions.com"
echo "2. Go to: My Account → Domains → Manage DNS"
echo "3. Select domain: $DOMAIN"
echo "4. Add each record listed above"
echo "5. Wait 5-60 minutes for DNS propagation"
echo ""

echo "=========================================="
echo "VERIFICATION COMMANDS:"
echo "=========================================="
echo ""
echo "After adding records, run these commands to verify:"
echo ""

echo "# Check SPF record:"
echo "dig TXT $DOMAIN | grep spf"
echo ""

echo "# Check DMARC record:"
echo "dig TXT _dmarc.$DOMAIN | grep DMARC"
echo ""

echo "# Check SendGrid CNAME records:"
echo "dig CNAME url5121.$DOMAIN"
echo "dig CNAME 51760082.$DOMAIN"
echo "dig CNAME em1811.$DOMAIN"
echo "dig CNAME s1._domainkey.$DOMAIN"
echo "dig CNAME s2._domainkey.$DOMAIN"
echo ""

echo "=========================================="
echo "QUICK VERIFICATION (run after adding records):"
echo "=========================================="
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

echo "Checking DNS records..."
echo ""

# Check SPF
check_record "TXT" "$DOMAIN" "v=spf1 include:sendgrid.net"

# Check DMARC
check_record "TXT" "_dmarc.$DOMAIN" "DMARC1"

# Check SendGrid CNAMEs
check_record "CNAME" "url5121.$DOMAIN" "sendgrid.net"
check_record "CNAME" "51760082.$DOMAIN" "sendgrid.net"
check_record "CNAME" "em1811.$DOMAIN" "sendgrid.net"
check_record "CNAME" "s1._domainkey.$DOMAIN" "domainkey"
check_record "CNAME" "s2._domainkey.$DOMAIN" "domainkey"

echo ""
echo "=========================================="
echo "NOTE:"
echo "=========================================="
echo "If records show as NOT FOUND:"
echo "1. Wait 5-60 minutes for DNS propagation"
echo "2. Clear DNS cache: sudo dscacheutil -flushcache (Mac)"
echo "3. Try using Google's DNS (8.8.8.8) to check"
echo "4. Verify records were added correctly in Network Solutions"
echo ""

