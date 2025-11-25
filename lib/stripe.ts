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

// Lazy getter - don't initialize at module load time
export function getStripeClient(): Stripe {
  return getStripe()
}

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
  
  try {
    const stripe = getStripeClient()
    
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
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic',
        },
      },
    })

    return session
  } catch (error) {
    console.error('Stripe checkout session creation error:', error)
    if (error instanceof Stripe.errors.StripeError) {
      console.error('Stripe error details:', {
        type: error.type,
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      })
    }
    throw error
  }
}

