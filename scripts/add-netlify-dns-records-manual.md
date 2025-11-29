# Add Missing SendGrid DNS Records to Netlify

## Current Status
✅ SPF record (TXT): `v=spf1 include:sendgrid.net ~all`
✅ DMARC record (TXT): `v=DMARC1; p=quarantine; ...`
✅ DKIM records: `s1._domainkey` and `s2._domainkey`

## Missing Records
You need to add these 3 CNAME records in Netlify DNS:

### 1. url5121 CNAME
- **Name**: `url5121`
- **Type**: `CNAME`
- **Value**: `sendgrid.net`
- **TTL**: `3600`

### 2. 51760082 CNAME
- **Name**: `51760082`
- **Type**: `CNAME`
- **Value**: `sendgrid.net`
- **TTL**: `3600`

### 3. em1811 CNAME
- **Name**: `em1811`
- **Type**: `CNAME`
- **Value**: `u51760082.wl083.sendgrid.net`
- **TTL**: `3600`

## How to Add in Netlify Dashboard

1. Go to: https://app.netlify.com/teams/mreoch1/dns/seochecksite.net
2. Click **"Add new record"** button
3. For each record above:
   - Select **Type**: `CNAME`
   - Enter **Name**: (the name from above, e.g., `url5121`)
   - Enter **Value**: (the value from above, e.g., `sendgrid.net`)
   - Set **TTL**: `3600`
   - Click **"Add record"**
4. Repeat for all 3 records

## Verification

After adding, wait 5-60 minutes for DNS propagation, then verify:

```bash
# Check url5121
dig CNAME url5121.seochecksite.net

# Check 51760082
dig CNAME 51760082.seochecksite.net

# Check em1811
dig CNAME em1811.seochecksite.net
```

Or run the verification script:
```bash
./scripts/add-dns-records-seochecksite.sh
```

## After Adding Records

1. Go to SendGrid Dashboard → Settings → Sender Authentication
2. Verify all DNS records show as "Verified"
3. Test email delivery to ensure emails land in inbox (not junk)

