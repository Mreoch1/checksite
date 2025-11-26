/**
 * Admin endpoint to clear stuck queue items
 * Marks all pending/processing items older than 1 hour as failed
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/middleware/auth'
import { getRequestId } from '@/lib/request-id'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)
  console.log(`[${requestId}] /api/admin/clear-stuck-queue called`)
  
  // Require admin authentication
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    // Find all pending/processing items older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    
    const { data: stuckItems, error: findError } = await supabase
      .from('audit_queue')
      .select('*, audits(*)')
      .in('status', ['pending', 'processing'])
      .lt('created_at', oneHourAgo)
    
    if (findError) {
      console.error(`[${requestId}] Error finding stuck items:`, findError)
      return NextResponse.json(
        { error: 'Failed to find stuck items', details: findError.message },
        { status: 500 }
      )
    }
    
    if (!stuckItems || stuckItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stuck queue items found',
        cleared: 0,
      })
    }
    
    // Mark all stuck items as failed
    const stuckIds = stuckItems.map(item => item.id)
    const { error: updateError } = await supabase
      .from('audit_queue')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        last_error: 'Marked as stuck - exceeded 1 hour processing time',
      })
      .in('id', stuckIds)
    
    if (updateError) {
      console.error(`[${requestId}] Error clearing stuck items:`, updateError)
      return NextResponse.json(
        { error: 'Failed to clear stuck items', details: updateError.message },
        { status: 500 }
      )
    }
    
    console.log(`[${requestId}] Cleared ${stuckItems.length} stuck queue items`)
    
    return NextResponse.json({
      success: true,
      message: `Cleared ${stuckItems.length} stuck queue items`,
      cleared: stuckItems.length,
      items: stuckItems.map(item => ({
        id: item.id,
        audit_id: item.audit_id,
        status: item.status,
        created_at: item.created_at,
        retry_count: item.retry_count,
      })),
    })
  } catch (error) {
    console.error(`[${requestId}] Unexpected error in clear-stuck-queue:`, error)
    return NextResponse.json(
      {
        error: 'Unexpected error clearing stuck queue',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

