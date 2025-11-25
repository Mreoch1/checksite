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
      
      // Add timeout wrapper (5 minutes)
      const processPromise = processAudit(auditId)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Inngest function timeout: Audit processing took longer than 5 minutes'))
        }, 300000) // 5 minutes
      })
      
      try {
        const result = await Promise.race([processPromise, timeoutPromise])
        console.log(`[Inngest] Audit ${auditId} completed successfully`)
        return { success: true, auditId }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorStack = error instanceof Error ? error.stack : 'No stack trace'
        const errorName = error instanceof Error ? error.name : 'Unknown'
        
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
        // Include the error message in the error name to ensure it's visible
        const descriptiveError = new Error(
          `[${errorName}] Audit ${auditId} failed: ${errorMessage}`
        )
        descriptiveError.name = `AuditError_${errorName}`
        if (errorStack) {
          descriptiveError.stack = errorStack
        }
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

