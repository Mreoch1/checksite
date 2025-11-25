import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { processAudit } from '@/lib/process-audit'

// Create Inngest function for processing audits
const processAuditFunction = inngest.createFunction(
  { 
    id: 'process-audit',
    // Add timeout at function level (5 minutes max)
    timeout: '5m',
  },
  { event: 'audit/process' },
  async ({ event, step }) => {
    const { auditId } = event.data

    return await step.run('process-audit', async () => {
      console.log(`[Inngest] Processing audit ${auditId}`)
      try {
        await processAudit(auditId)
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

