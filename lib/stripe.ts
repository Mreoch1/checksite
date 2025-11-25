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
      apiVersion: '2024-06-20.acacia',
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
    metadata: {
      audit_id: data.auditId,
      url: data.url,
      modules: data.selectedModules.join(','),
    },
  })

  return session
}

