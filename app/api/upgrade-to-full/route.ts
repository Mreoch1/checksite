import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(key, { apiVersion: '2023-10-16' })
}

export async function POST(request: NextRequest) {
  try {
    const { auditId } = await request.json()

    if (!auditId) {
      return NextResponse.json({ error: 'Missing auditId' }, { status: 400 })
    }

    const db = getSupabaseServiceClient()
    const { data: audit, error } = await db
      .from('audits')
      .select('*, customers(*)')
      .eq('id', auditId)
      .single()

    if (error || !audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
    }

    // Make sure it's a teaser (free) report
    if (audit.total_price_cents !== 0 && audit.total_price_cents !== null) {
      return NextResponse.json({ error: 'This audit already has a full report' }, { status: 400 })
    }

    const customerEmail = (audit.customers as any)?.email
    if (!customerEmail) {
      return NextResponse.json({ error: 'No customer email found' }, { status: 400 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.net'
    const stripe = getStripe()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Full SEO Audit Report',
            description: `Complete audit report with detailed fix instructions for ${audit.url}`,
          },
          unit_amount: 1499, // $14.99
        },
        quantity: 1,
      }],
      customer_email: customerEmail,
      metadata: {
        upgrade_audit_id: auditId, // Use upgrade prefix to distinguish from new audits
      },
      success_url: `${siteUrl}/report/${auditId}?upgraded=true`,
      cancel_url: `${siteUrl}/report/${auditId}`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Upgrade checkout error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
