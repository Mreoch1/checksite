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

    // Use Inngest step timeout feature (5 minutes)
    return await step.run('process-audit', async () => {
      console.log(`[Inngest] Processing audit ${auditId} at ${new Date().toISOString()}`)
      await processAudit(auditId)
      console.log(`[Inngest] Audit ${auditId} completed successfully`)
      return { success: true, auditId }
    }, {
      timeout: '5m', // Inngest step timeout
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

