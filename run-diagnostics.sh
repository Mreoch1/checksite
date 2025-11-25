#!/bin/bash
# Run diagnostics on failed audit

AUDIT_ID="bf835397-18f3-4669-9ba7-76d5fb0f47a4"
BASE_URL="https://seochecksite.netlify.app"

echo "🔍 Running Audit Diagnostics"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Diagnose the audit
echo "Step 1: Diagnosing audit..."
echo ""
curl -s "${BASE_URL}/api/admin/diagnose-audit?id=${AUDIT_ID}" | python3 -m json.tool
echo ""
echo ""

# Step 2: Test website fetch
echo "Step 2: Testing website fetch..."
echo ""
curl -s -X POST "${BASE_URL}/api/admin/test-audit-step" \
  -H "Content-Type: application/json" \
  -d '{"step": "fetch_site", "url": "https://seoauditpro.net"}' | python3 -m json.tool
echo ""
echo ""

# Step 3: Test LLM
echo "Step 3: Testing LLM report generation..."
echo ""
curl -s -X POST "${BASE_URL}/api/admin/test-audit-step" \
  -H "Content-Type: application/json" \
  -d '{"step": "test_llm", "url": "https://seoauditpro.net"}' | python3 -m json.tool
echo ""
echo ""

# Step 4: Test email
echo "Step 4: Testing email sending..."
echo ""
curl -s -X POST "${BASE_URL}/api/admin/test-audit-step" \
  -H "Content-Type: application/json" \
  -d '{"step": "test_email", "url": "https://seoauditpro.net", "email": "Mreoch82@hotmail.com"}' | python3 -m json.tool
echo ""
echo ""

echo "✅ Diagnostics complete!"
echo "Review the results above to identify which step is failing."

