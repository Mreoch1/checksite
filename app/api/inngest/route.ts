import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { processAudit } from '@/lib/process-audit'

// Create Inngest function for processing audits
const processAuditFunction = inngest.createFunction(
  { id: 'process-audit' },
  { event: 'audit/process' },
  async ({ event, step }) => {
    const { auditId } = event.data

    return await step.run('process-audit', async () => {
      console.log(`[Inngest] Processing audit ${auditId}`)
      await processAudit(auditId)
      return { success: true, auditId }
    })
  }
)

// Export the Inngest serve handler
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processAuditFunction],
})

