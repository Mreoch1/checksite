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
        await Promise.race([processPromise, timeoutPromise])
        console.log(`[Inngest] Audit ${auditId} completed successfully`)
        return { success: true, auditId }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorStack = error instanceof Error ? error.stack : 'No stack trace'
        console.error(`[Inngest] Error processing audit ${auditId}:`, errorMessage)
        console.error(`[Inngest] Error stack:`, errorStack)
        console.error(`[Inngest] Full error object:`, JSON.stringify(error, Object.getOwnPropertyNames(error)))
        // Re-throw with more details
        throw new Error(`Audit processing failed: ${errorMessage}. Stack: ${errorStack}`)
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

