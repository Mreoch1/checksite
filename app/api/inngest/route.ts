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
// In dev mode (no event key/signing key), it will automatically use dev mode
// In production (with keys), it will use cloud mode
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processAuditFunction],
  // Explicitly set dev mode for local development
  // This will be overridden by environment variables in production
  ...(process.env.NODE_ENV === 'development' && !process.env.INNGEST_EVENT_KEY
    ? { isDev: true }
    : {}),
})

