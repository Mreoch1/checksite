import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { processAudit } from '@/lib/process-audit'

// Create Inngest function for processing audits
const processAuditFunction = inngest.createFunction(
  { 
    id: 'process-audit',
    // Add timeout at function level (5 minutes)
    timeouts: {
      function: '5m',
    },
    retries: 0, // Don't retry on failure
  },
  { event: 'audit/process' },
  async ({ event, step }) => {
    const { auditId } = event.data

    // Wrap in step with explicit timeout
    return await step.run('process-audit', async () => {
      console.log(`[Inngest] Processing audit ${auditId} at ${new Date().toISOString()}`)
      
      // Add timeout wrapper at step level
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
        console.error(`[Inngest] Error processing audit ${auditId}:`, error)
        throw error
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

