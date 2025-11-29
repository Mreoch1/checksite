# DNS Setup Guide for Email Deliverability
## Domain: seochecksite.net

## Critical Issue: Emails Going to Junk/Spam

Your emails are going to junk because **SPF record is missing**. This is the #1 reason emails get marked as spam.

## Required DNS Records

### 1. SPF Record (CRITICAL - MISSING)
**Type**: TXT  
**Name/Host**: `@` (or leave blank for root domain)  
**Value**: `v=spf1 include:sendgrid.net ~all`  
**TTL**: 3600 (or default)

**Why this matters**: SPF tells email providers that SendGrid is authorized to send emails on behalf of your domain. Without it, emails are marked as spam.

### 2. SendGrid DNS Records
- CNAME: `url5121` → `sendgrid.net`
- CNAME: `51760082` → `sendgrid.net`
- CNAME: `em1811` → `u51760082.wl083.sendgrid.net`
- CNAME: `s1._domainkey` → `s1.domainkey.u51760082.wl083.sendgrid.net`
- CNAME: `s2._domainkey` → `s2.domainkey.u51760082.wl083.sendgrid.net`

### 3. DMARC Record (Already configured, but needs update)
**Type**: TXT  
**Name/Host**: `_dmarc`  
**Current Value**: `v=DMARC1; p=none; rua=mailto:contact@seochecksite.net`  
**Recommended Value**: `v=DMARC1; p=quarantine; rua=mailto:contact@seochecksite.net; ruf=mailto:contact@seochecksite.net`

**Why update**: `p=none` means "don't enforce anything". `p=quarantine` means "send suspicious emails to spam folder". After monitoring for 1-2 weeks, change to `p=reject` to block suspicious emails entirely.

## Setup Steps

### Step 1: Add SPF Record (URGENT)
1. Log into your DNS provider (Namecheap, GoDaddy, Cloudflare, etc.)
2. Add a new TXT record:
   - **Name**: `@` (or leave blank)
   - **Value**: `v=spf1 include:sendgrid.net ~all`
   - **TTL**: 3600
3. Save and wait for DNS propagation (usually 5-60 minutes)

### Step 2: Verify SendGrid DNS Records
1. Go to SendGrid Dashboard → Settings → Sender Authentication
2. Verify all DNS records are properly configured
3. SendGrid will show "Verified" when all records are correct

### Step 3: Update DMARC Policy
1. Update the `_dmarc` TXT record to use `p=quarantine`
2. Monitor DMARC reports for 1-2 weeks
3. If no issues, change to `p=reject` for maximum protection

### Step 4: Test Email Deliverability
1. Send a test email to your own email address
2. Check if it lands in inbox (not junk)
3. Use tools like:
   - [Mail-Tester.com](https://www.mail-tester.com) - Send email to their test address and get a score
   - [MXToolbox Email Header Analyzer](https://mxtoolbox.com/EmailHeaders.aspx) - Check email headers

## Verification Commands

After adding DNS records, verify they're working:

```bash
# Check SPF record
dig TXT seoauditpro.net | grep spf

# Check DMARC record
dig TXT _dmarc.seoauditpro.net | grep DMARC

# Check SendGrid CNAME records
dig CNAME s1._domainkey.seoauditpro.net
dig CNAME s2._domainkey.seoauditpro.net
```

## Expected Results

After proper DNS setup:
- ✅ SPF record: `v=spf1 include:sendgrid.net ~all`
- ✅ DKIM records: Verified in SendGrid dashboard
- ✅ DMARC record: `v=DMARC1; p=quarantine; ...`
- ✅ Emails land in inbox (not junk)

## Troubleshooting

### Emails still going to junk?
1. **Check SPF**: Make sure SPF record is added and propagated
2. **Check SendGrid**: Verify all DNS records in SendGrid dashboard
3. **Check DMARC**: Update policy from `p=none` to `p=quarantine`
4. **Check email content**: Avoid spam trigger words, use proper HTML structure
5. **Warm up domain**: If domain is new, send emails gradually to build reputation

### DNS not propagating?
- Wait 24-48 hours for full propagation
- Clear DNS cache: `sudo dscacheutil -flushcache` (Mac) or `ipconfig /flushdns` (Windows)
- Use different DNS server to check (e.g., Google's 8.8.8.8)

## Priority Actions

1. **URGENT**: Add SPF record (this is why emails go to junk)
2. **HIGH**: Verify all SendGrid DNS records are configured
3. **MEDIUM**: Update DMARC policy to `p=quarantine`
4. **LOW**: Monitor and optimize over time

