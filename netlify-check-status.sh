#!/bin/bash
# Quick Netlify status check (non-interactive)

echo "📊 Netlify Status Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get site info
netlify status 2>/dev/null | grep -E "(Current project|Project URL|Admin URL)" || netlify status

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Checking Inngest Environment Variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for Inngest vars (non-interactive)
if netlify env:list 2>/dev/null | grep -q "INNGEST_APP_ID"; then
  echo "✅ INNGEST_APP_ID: Set"
else
  echo "❌ INNGEST_APP_ID: Not set"
fi

if netlify env:list 2>/dev/null | grep -q "INNGEST_EVENT_KEY"; then
  echo "✅ INNGEST_EVENT_KEY: Set"
else
  echo "❌ INNGEST_EVENT_KEY: Not set"
fi

if netlify env:list 2>/dev/null | grep -q "INNGEST_SIGNING_KEY"; then
  echo "✅ INNGEST_SIGNING_KEY: Set"
else
  echo "❌ INNGEST_SIGNING_KEY: Not set"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 To Set Inngest Variables:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "netlify env:set INNGEST_APP_ID=your_app_id"
echo "netlify env:set INNGEST_EVENT_KEY=your_event_key"
echo "netlify env:set INNGEST_SIGNING_KEY=your_signing_key"
echo ""
echo "Or run the interactive setup:"
echo "  ./setup-inngest-complete.sh"
echo ""

