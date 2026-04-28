import { generateSimpleReport } from './generate-simple-report'
import { sendAuditReportEmail } from './email-unified'
import { getSupabaseServiceClient } from './supabase'

/**
 * Regenerate a full report for an audit that currently has a teaser (free) report.
 * Called when a user upgrades from free preview to paid full report.
 */
export async function regenerateFullReport(auditId: string): Promise<{ success: boolean; message: string }> {
  const db = getSupabaseServiceClient()

  // Fetch the audit with raw results
  const { data: audit, error } = await db
    .from('audits')
    .select('*, customers(*)')
    .eq('id', auditId)
    .single()

  if (error || !audit) {
    console.error(`[regenerateFullReport] Audit ${auditId} not found:`, error)
    return { success: false, message: 'Audit not found' }
  }

  if (!audit.raw_result_json || typeof audit.raw_result_json !== 'object') {
    console.error(`[regenerateFullReport] Audit ${auditId} has no raw results to regenerate from`)
    return { success: false, message: 'No raw results found' }
  }

  // Fetch enabled modules to get the scores
  const { data: modules } = await db
    .from('audit_modules')
    .select('*')
    .eq('audit_id', auditId)
    .eq('enabled', true)

  if (!modules || modules.length === 0) {
    console.error(`[regenerateFullReport] Audit ${auditId} has no enabled modules`)
    return { success: false, message: 'No modules found' }
  }

  // Build the report data from existing raw results
  const rawData = audit.raw_result_json as any
  const overallScore = rawData.overallScore || audit.modules?.reduce?.((sum: number, m: any) => sum + (m.score || 0), 0) / Math.max(modules.length, 1) || 0

  // Regenerate as FULL report (teaser: false)
  const result = generateSimpleReport({
    url: audit.url,
    pageAnalysis: rawData.pageAnalysis,
    modules: rawData.modules || [],
    overallScore: overallScore,
    screenshots: rawData.screenshots,
  }, { teaser: false })

  if (!result.html || result.html.trim().length === 0) {
    return { success: false, message: 'Report generation returned empty HTML' }
  }

  // Update the audit with full report
  const { error: updateError } = await db
    .from('audits')
    .update({
      formatted_report_html: result.html,
      formatted_report_plaintext: result.plaintext,
      status: 'completed',
      email_sent_at: null, // Clear so email will be re-sent
    })
    .eq('id', auditId)

  if (updateError) {
    console.error(`[regenerateFullReport] Failed to update audit ${auditId}:`, updateError)
    return { success: false, message: 'Failed to save full report' }
  }

  // Send the full report email
  const customerEmail = (audit.customers as any)?.email
  if (customerEmail) {
    try {
      await sendAuditReportEmail(customerEmail, audit.url, audit.id, result.html)
      console.log(`[regenerateFullReport] Full report email sent to ${customerEmail}`)
      
      // Mark email as sent
      await db
        .from('audits')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', auditId)
    } catch (emailError) {
      console.error(`[regenerateFullReport] Failed to send email:`, emailError)
      // Don't fail - report is saved even if email fails
    }
  }

  return { success: true, message: 'Full report regenerated and sent' }
}
