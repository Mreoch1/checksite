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
      const startTime = new Date().toISOString()
      console.log(`[Inngest] Processing audit ${auditId} at ${startTime}`)
      
      try {
        // Add timeout wrapper (5 minutes)
        const processPromise = processAudit(auditId)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Inngest function timeout: Audit processing took longer than 5 minutes'))
          }, 300000) // 5 minutes
        })
        
        const result = await Promise.race([processPromise, timeoutPromise])
        
        // processAudit doesn't return a value, so result will be undefined
        // But if we get here without an error, the audit completed
        console.log(`[Inngest] Audit ${auditId} completed successfully`)
        console.log(`[Inngest] processAudit returned:`, result)
        
        // Verify the audit was actually completed by checking the database
        const { supabase } = await import('@/lib/supabase')
        const { data: auditCheck } = await supabase
          .from('audits')
          .select('status, completed_at, formatted_report_html')
          .eq('id', auditId)
          .single()
        
        if (!auditCheck) {
          throw new Error(`Audit ${auditId} not found after processing`)
        }
        
        if (auditCheck.status !== 'completed') {
          throw new Error(`Audit ${auditId} status is ${auditCheck.status}, expected 'completed'`)
        }
        
        if (!auditCheck.formatted_report_html) {
          throw new Error(`Audit ${auditId} completed but has no formatted report`)
        }
        
        console.log(`[Inngest] Verified audit ${auditId} is completed with report`)
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
          // Check if error_log already exists - don't overwrite original error
          const { data: existingAudit } = await supabase
            .from('audits')
            .select('error_log')
            .eq('id', auditId)
            .single()
          
          // Only update error_log if it doesn't exist or is empty
          // This preserves the original error from processAudit
          const updateData: any = { status: 'failed' }
          if (!existingAudit?.error_log) {
            updateData.error_log = errorLog
            console.log(`[Inngest] ✅ Storing verification error log for audit ${auditId}`)
          } else {
            // Append verification error to existing log
            try {
              const existingLog = typeof existingAudit.error_log === 'string' 
                ? JSON.parse(existingAudit.error_log) 
                : existingAudit.error_log
              const combinedLog = {
                ...existingLog,
                verificationError: JSON.parse(errorLog),
                verificationTimestamp: new Date().toISOString(),
              }
              updateData.error_log = JSON.stringify(combinedLog, null, 2)
              console.log(`[Inngest] ✅ Appending verification error to existing log for audit ${auditId}`)
            } catch {
              // If parsing fails, keep original
              console.log(`[Inngest] ⚠️  Could not parse existing error log, keeping original`)
            }
          }
          
          await supabase
            .from('audits')
            .update(updateData)
            .eq('id', auditId)
          console.log(`[Inngest] ✅ Marked audit ${auditId} as failed`)
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
        // Inngest serializes errors, so we need to ensure the message is clear
        const errorMsg = errorMessage || 'An unknown error occurred'
        
        // Create error with clear message - Inngest should capture this
        const descriptiveError = new Error(errorMsg)
        descriptiveError.name = errorName || 'Error'
        
        // Preserve stack trace if available
        if (errorStack) {
          descriptiveError.stack = errorStack
        }
        
        // Add context to error message for better visibility in Inngest
        // Prefix with audit ID and error type for easier debugging
        const fullErrorMessage = `[Audit ${auditId}] ${errorName || 'Error'}: ${errorMsg}`
        descriptiveError.message = fullErrorMessage
        
        // Attach properties that Inngest might serialize
        // Some Inngest versions look for these specific property names
        Object.assign(descriptiveError, {
          errorMessage: errorMsg,
          errorType: errorName || 'Error',
          auditId: auditId,
          originalMessage: errorMsg,
          originalName: errorName || 'Error',
        })
        
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

