import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { processAudit } from '@/app/api/webhooks/stripe/route'
import { inngest } from '@/lib/inngest'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { auditId } = await request.json()

    if (!auditId) {
      return NextResponse.json(
        { error: 'Audit ID is required' },
        { status: 400 }
      )
    }

    console.log(`Retrying audit ${auditId}`)

    // Get audit details
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select('*, customers(*)')
      .eq('id', auditId)
      .single()

    if (auditError || !audit) {
      return NextResponse.json(
        { error: 'Audit not found', details: auditError?.message },
        { status: 404 }
      )
    }

    // Update status to running
    await supabase
      .from('audits')
      .update({ status: 'running' })
      .eq('id', auditId)

    // Trigger Inngest function for background processing
    console.log(`Retrying audit via Inngest: ${auditId}`)
    
    try {
      await inngest.send({
        name: 'audit/process',
        data: { auditId },
      })
      console.log(`✅ Inngest event sent for retry of audit ${auditId}`)
    } catch (error) {
      console.error('❌ Failed to send Inngest event:', error)
      // Fallback to direct processing
      processAudit(auditId).catch((processError) => {
        console.error('Background audit processing failed:', processError)
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Audit retry started in background',
      auditId,
      status: 'running',
    })
  } catch (error) {
    console.error('Error in retry endpoint:', error)
    return NextResponse.json(
      {
        error: 'Failed to retry audit',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

