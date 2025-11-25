#!/bin/bash
# Set Resend API key in Netlify

RESEND_API_KEY="re_F5VkZUT1_FKhg1mX2Wvf5pAcBvkvmurvQ"

echo "Setting RESEND_API_KEY in Netlify..."
netlify env:set RESEND_API_KEY "$RESEND_API_KEY"

if [ $? -eq 0 ]; then
  echo "✅ RESEND_API_KEY set successfully!"
  echo ""
  echo "Next steps:"
  echo "1. Wait 1-2 minutes for the environment variable to propagate"
  echo "2. Test email: curl -X POST https://seochecksite.netlify.app/api/test-email -H 'Content-Type: application/json' -d '{\"email\": \"Mreoch82@hotmail.com\"}'"
  echo "3. Create a new audit to test full flow"
else
  echo "❌ Failed to set RESEND_API_KEY"
  echo ""
  echo "Manual setup:"
  echo "1. Go to: https://app.netlify.com/sites/seochecksite/settings/env"
  echo "2. Add environment variable:"
  echo "   Key: RESEND_API_KEY"
  echo "   Value: $RESEND_API_KEY"
  echo "3. Save and redeploy"
fi

