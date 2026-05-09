# GSC Automation Guide

## Two Approaches

1. **Browser automation** (this guide) — uses the OpenClaw browser profile for manual interaction (Request Indexing, URL Inspection)
2. **GSC API** (`lib/search-console-api.ts`) — programmatic access for pulling performance data, indexing stats, and sitemaps. Requires service account setup per REQUIRED_SECRETS.md

## Browser Setup
- Use the OpenClaw browser (profile=`openclaw`, label=`gsc`)
- Already logged in as `mreoch82@hotmail.com` (Google account with passkey)
- Property: `seochecksite.net`

## Navigation Patterns (Google SPA)

### Open URL Inspection
```javascript
// Click Search button to expand URL inspection bar
const searchBtn = document.querySelector('[aria-label="Search"]');
searchBtn.click();

// Fill in URL to inspect
const input = document.querySelector('[aria-label*="Inspect any URL"]');
input.value = 'https://seochecksite.net/resources/example';
input.dispatchEvent(new Event('input', {bubbles: true}));
```

### Navigate to Inspection Page
```javascript
// Click the dropdown option
const opt = document.querySelector('[role="listbox"] [role="option"]');
opt.click();
```

### Request Indexing
```javascript
// Wait for inspection page to load, then:
const btn = document.querySelector('button');
// Find button with "Request indexingRequest again" text
btn.click();
// Wait for "Indexing requested" dialog
```

### Navigate Between Pages (SPA)
```javascript
// Use pushState + popstate for client-side navigation
window.history.pushState({}, '', '/search-console/index?resource_id=https://seochecksite.net/');
window.dispatchEvent(new PopStateEvent('popstate'));
```

## Daily Limit
- Google caps "Request Indexing" at ~10 URLs/day per property
- Prioritize pages with most search impressions

## Key URLs
- Overview: `https://search.google.com/search-console?resource_id=https://seochecksite.net/`
- Indexing: `https://search.google.com/search-console/index?resource_id=https://seochecksite.net/`
- Sitemaps: `https://search.google.com/search-console/sitemaps?resource_id=https://seochecksite.net/`
- Performance: `https://search.google.com/search-console/performance/search-analytics?resource_id=https://seochecksite.net/&breakdown=page`
