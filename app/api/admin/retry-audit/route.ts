import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { processAudit } from '@/lib/process-audit' // Used as fallback if queue fails
import { requireAdminAuth } from '@/lib/middleware/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // Require admin authentication
  const authError = requireAdminAuth(request)
  if (authError) return authError
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

    // Add to queue instead of processing directly (avoids Netlify timeout)
    console.log(`Adding audit ${auditId} to processing queue for retry`)
    const { error: queueError } = await supabase
      .from('audit_queue')
      .upsert({
        audit_id: auditId,
        status: 'pending',
        retry_count: 0,
        last_error: null,
      }, {
        onConflict: 'audit_id',
      })

    if (queueError) {
      console.error('Error adding audit to queue:', queueError)
      // Fallback: try direct processing if queue fails
      processAudit(auditId).catch((processError) => {
        console.error('Background audit processing failed:', processError)
      })
    } else {
      console.log(`✅ Audit ${auditId} added to queue for retry`)
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

