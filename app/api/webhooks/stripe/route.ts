import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'
import { sendAuditFailureEmail } from '@/lib/email-unified'
import { inngest } from '@/lib/inngest'
import { processAudit } from '@/lib/process-audit'

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

    // Trigger Inngest function for background processing
    // This avoids Netlify function timeout issues
    console.log(`Triggering Inngest function for audit_id: ${auditId}`)
    
    try {
      await inngest.send({
        name: 'audit/process',
        data: { auditId },
      })
      console.log(`✅ Inngest event sent for audit ${auditId}`)
    } catch (error) {
      console.error('❌ Failed to send Inngest event:', error)
      // Fallback to direct processing if Inngest fails
      console.log('Falling back to direct processing...')
      processAudit(auditId).catch(async (processError) => {
        console.error('Error processing audit:', processError)
        await supabase
          .from('audits')
          .update({ status: 'failed' })
          .eq('id', auditId)
        
        try {
          const { data: audit } = await supabase
            .from('audits')
            .select('*, customers(*)')
            .eq('id', auditId)
            .single()
          
          if (audit) {
            const customer = audit.customers as any
            if (customer?.email) {
              await sendAuditFailureEmail(customer.email, audit.url)
            }
          }
        } catch (emailError) {
          console.error('Error sending failure email:', emailError)
        }
      })
    }
  }

  return NextResponse.json({ received: true })
}

