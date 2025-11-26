import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'
import { sendAuditFailureEmail } from '@/lib/email-unified'
import { processAudit } from '@/lib/process-audit' // Used as fallback if queue fails

// Force dynamic rendering - webhooks must be dynamic
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const fetchCache = 'force-no-store'
export const revalidate = 0

function getStripe(): Stripe {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required')
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
  })
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event

  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const auditId = session.metadata?.audit_id

    if (!auditId) {
      console.error('No audit_id in session metadata')
      return NextResponse.json({ received: true })
    }

    // Update audit status to running
    await supabase
      .from('audits')
      .update({ status: 'running' })
      .eq('id', auditId)

    // Add to queue instead of processing directly (avoids Netlify timeout)
    // Use upsert to prevent duplicates if audit was already queued
    // CRITICAL: Reset created_at when upserting to ensure proper 5-minute delay
    console.log(`Adding audit ${auditId} to processing queue`)
    const { error: queueError } = await supabase
      .from('audit_queue')
      .upsert({
        audit_id: auditId,
        status: 'pending',
        retry_count: 0,
        last_error: null,
        created_at: new Date().toISOString(), // Reset created_at to now when upserting
      }, {
        onConflict: 'audit_id',
      })

    if (queueError) {
      console.error('Error adding audit to queue:', queueError)
      // Fallback: try direct processing if queue fails
      console.log('Falling back to direct processing...')
      processAudit(auditId).catch(async (processError) => {
        console.error('Error processing audit:', processError)
      })
    } else {
      console.log(`✅ Audit ${auditId} added to queue - will be processed by queue worker`)
    }
  }

  return NextResponse.json({ received: true })
}

