# How to Enable Stripe Receipt Emails

## Step-by-Step Instructions

1. **Log in to Stripe Dashboard**
   - Go to: https://dashboard.stripe.com
   - Make sure you're in **Test mode** (toggle in top right) for testing, or **Live mode** for production

2. **Navigate to Customer Email Settings**
   - Click **Settings** in the left sidebar
   - Click **Customer emails** (under "Business settings")

3. **Enable Receipt Emails**
   - Under the **Payments** section
   - Toggle **ON** the switch for **"Successful payments"**
   - This will automatically send receipt emails to customers after successful payments

4. **Verify It's Enabled**
   - You should see a green checkmark or "Enabled" status
   - The receipt email will include:
     - Payment details
     - Product description (which includes the report link)
     - Receipt PDF

## What Customers Will Receive

When a customer completes payment, they will automatically receive:
- **Stripe receipt email** with:
  - Payment confirmation
  - Report link in the product description
  - Receipt PDF attachment

The report link format: `https://seochecksite.netlify.app/report/{audit_id}`

## Testing

To test receipt emails:
1. Make a test payment using card: `4242 4242 4242 4242`
2. Check the email address used in the checkout
3. You should receive the Stripe receipt email within seconds
4. The receipt will contain the report link in the description

## Notes

- Receipt emails are sent automatically by Stripe (no additional setup needed)
- The report link is included in the product description
- Customers can bookmark the link or wait for the report to be ready
- Report processing typically takes 2-5 minutes after payment

