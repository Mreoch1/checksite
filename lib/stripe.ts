/**
 * Stripe integration helpers
 */

import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

function getStripe(): Stripe {
  if (!stripeInstance) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required')
    }
      stripeInstance = new Stripe(stripeSecretKey, {
        apiVersion: '2023-10-16',
      })
  }
  return stripeInstance
}

export const stripe = getStripe()

export interface CheckoutSessionData {
  auditId: string
  url: string
  email: string
  selectedModules: string[]
  totalPriceCents: number
}

/**
 * Create a Stripe Checkout session for an audit
 */
export async function createCheckoutSession(
  data: CheckoutSessionData,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const reportUrl = `${siteUrl}/report/${data.auditId}`
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Website Audit',
            description: `Complete audit for ${data.url}`,
          },
          unit_amount: data.totalPriceCents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: data.email,
    // Add terms and privacy policy links (required for Stripe compliance)
    consent_collection: {
      terms_of_service: 'required',
    },
    terms_of_service_url: `${siteUrl}/terms`,
    payment_intent_data: {
      description: `Website Audit for ${data.url}`,
      metadata: {
        audit_id: data.auditId,
        report_url: reportUrl,
      },
    },
    metadata: {
      audit_id: data.auditId,
      url: data.url,
      modules: data.selectedModules.join(','),
      report_url: reportUrl,
    },
    // Add terms and privacy links
    payment_method_options: {
      card: {
        request_three_d_secure: 'automatic',
      },
    },
  })

  return session
}

