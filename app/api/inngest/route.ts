import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { processAudit } from '@/lib/process-audit'

// Create Inngest function for processing audits
const processAuditFunction = inngest.createFunction(
  { 
    id: 'process-audit',
    // Timeout is handled via Promise.race wrapper in the step
    retries: 0, // Don't retry on failure
  },
  { event: 'audit/process' },
  async ({ event, step }) => {
    const { auditId } = event.data

    // Use Inngest step with timeout wrapper
    return await step.run('process-audit', async () => {
      console.log(`[Inngest] Processing audit ${auditId} at ${new Date().toISOString()}`)
      
      try {
        // Add timeout wrapper (5 minutes)
        const processPromise = processAudit(auditId)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Inngest function timeout: Audit processing took longer than 5 minutes'))
          }, 300000) // 5 minutes
        })
        
        const result = await Promise.race([processPromise, timeoutPromise])
        console.log(`[Inngest] Audit ${auditId} completed successfully`)
        return { success: true, auditId }
      } catch (error) {
        // Log the raw error immediately to see what we're actually getting
        console.error(`[Inngest] Raw error caught:`, error)
        console.error(`[Inngest] Error type:`, typeof error)
        console.error(`[Inngest] Error constructor:`, error?.constructor?.name)
        if (error instanceof Error) {
          console.error(`[Inngest] Error.message:`, error.message)
          console.error(`[Inngest] Error.name:`, error.name)
          console.error(`[Inngest] Error.stack:`, error.stack)
        } else {
          console.error(`[Inngest] Error stringified:`, JSON.stringify(error))
        }
        // Ensure error is caught and audit is marked as failed
        // The error might not reach processAudit's catch block if it happens here
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorStack = error instanceof Error ? error.stack : 'No stack trace'
        const errorName = error instanceof Error ? error.name : 'Unknown'
        
        console.error(`[Inngest] ❌ Error in step.run for audit ${auditId}:`)
        console.error(`[Inngest] Error name: ${errorName}`)
        console.error(`[Inngest] Error message: ${errorMessage}`)
        console.error(`[Inngest] Error stack: ${errorStack}`)
        
        // Try to mark audit as failed and store error log
        // Import supabase here to avoid circular dependencies
        const { supabase } = await import('@/lib/supabase')
        
        const errorLog = JSON.stringify({
          errorName,
          errorMessage,
          errorStack: errorStack ? errorStack.substring(0, 5000) : 'No stack trace',
          timestamp: new Date().toISOString(),
          source: 'Inngest step.run',
        }, null, 2)
        
        try {
          await supabase
            .from('audits')
            .update({ 
              status: 'failed',
              error_log: errorLog,
            } as any)
            .eq('id', auditId)
          console.log(`[Inngest] ✅ Marked audit ${auditId} as failed and stored error log`)
        } catch (updateError) {
          console.error(`[Inngest] Could not update audit status:`, updateError)
          // Try without error_log if column doesn't exist
          try {
            await supabase
              .from('audits')
              .update({ status: 'failed' })
              .eq('id', auditId)
          } catch (statusError) {
            console.error(`[Inngest] Could not update audit status at all:`, statusError)
          }
        }
        
        // Log detailed error information
        console.error(`[Inngest] ❌ Error processing audit ${auditId}:`)
        console.error(`[Inngest] Error name: ${errorName}`)
        console.error(`[Inngest] Error message: ${errorMessage}`)
        console.error(`[Inngest] Error stack: ${errorStack}`)
        
        // Try to stringify error for full details
        try {
          const errorDetails = {
            name: errorName,
            message: errorMessage,
            stack: errorStack,
            ...(error instanceof Error ? { cause: error.cause } : {}),
          }
          console.error(`[Inngest] Error details:`, JSON.stringify(errorDetails, null, 2))
        } catch (jsonError) {
          console.error(`[Inngest] Could not stringify error:`, jsonError)
        }
        
        // Use step.sendEvent to log error details that Inngest can capture
        try {
          await step.sendEvent('audit-error', {
            name: 'audit/error',
            data: {
              auditId,
              errorName,
              errorMessage,
              errorStack: errorStack ? errorStack.substring(0, 1000) : 'No stack trace', // Limit stack trace size
              timestamp: new Date().toISOString(),
            },
          })
        } catch (eventError) {
          console.error(`[Inngest] Could not send error event:`, eventError)
        }
        
        // Create a more descriptive error that Inngest can display
        // Put the actual error message in the Error message itself (most important)
        const errorMsg = errorMessage || 'An unknown error occurred'
        const descriptiveError = new Error(
          `Audit ${auditId} failed: ${errorMsg}`
        )
        descriptiveError.name = errorName || 'Error'
        if (errorStack) {
          descriptiveError.stack = errorStack
        }
        
        // Attach additional properties that Inngest might serialize
        ;(descriptiveError as any).errorMessage = errorMsg
        ;(descriptiveError as any).errorType = errorName || 'Error'
        ;(descriptiveError as any).auditId = auditId
        
        throw descriptiveError
      }
    })
  }
)

// Export the Inngest serve handler
// Mode is automatically detected:
// - Dev mode: When running locally without INNGEST_EVENT_KEY
// - Cloud mode: When INNGEST_EVENT_KEY is set (production)
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processAuditFunction],
})

