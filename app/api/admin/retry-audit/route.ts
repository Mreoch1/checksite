import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { runAuditModules } from '@/lib/audit/modules'
import { generateReport } from '@/lib/llm'
import { sendAuditReportEmail, sendAuditFailureEmail } from '@/lib/email'
import { ModuleKey } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { auditId } = await request.json()

    if (!auditId) {
      return NextResponse.json(
        { error: 'Audit ID is required' },
        { status: 400 }
      )
    }

    console.log(`Retrying audit ${auditId}`)

    // Get audit details
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select('*, customers(*)')
      .eq('id', auditId)
      .single()

    if (auditError || !audit) {
      return NextResponse.json(
        { error: 'Audit not found', details: auditError?.message },
        { status: 404 }
      )
    }

    // Update status to running
    await supabase
      .from('audits')
      .update({ status: 'running' })
      .eq('id', auditId)

    try {
      // Get enabled modules
      const { data: modules, error: modulesError } = await supabase
        .from('audit_modules')
        .select('*')
        .eq('audit_id', auditId)
        .eq('enabled', true)

      if (modulesError || !modules) {
        throw new Error('Failed to fetch modules')
      }

      const enabledModules = modules.map(m => m.module_key as ModuleKey)
      console.log(`Running ${enabledModules.length} audit modules:`, enabledModules)

      // Run audit modules
      console.log('Starting audit module execution...')
      const results = await runAuditModules(audit.url, enabledModules)
      console.log(`Audit modules completed. Results: ${results.length} modules`)

      // Calculate overall score
      const overallScore = Math.round(
        results.reduce((sum, r) => sum + r.score, 0) / results.length
      )

      // Store raw results
      const auditResult = {
        url: audit.url,
        modules: results,
        overallScore,
      }

      await supabase
        .from('audits')
        .update({
          raw_result_json: auditResult,
        })
        .eq('id', auditId)

      // Update module scores
      for (const result of results) {
        await supabase
          .from('audit_modules')
          .update({
            raw_score: result.score,
            raw_issues_json: result.issues,
          })
          .eq('audit_id', auditId)
          .eq('module_key', result.moduleKey)
      }

      // Generate formatted report
      console.log('Generating formatted report with DeepSeek...')
      const { html, plaintext } = await generateReport(auditResult)
      console.log('Report generated successfully')

      // Update audit with formatted report
      await supabase
        .from('audits')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          formatted_report_html: html,
          formatted_report_plaintext: plaintext,
        })
        .eq('id', auditId)

      // Send email
      const customer = audit.customers as any
      try {
        console.log(`Attempting to send email to ${customer.email} for audit ${auditId}`)
        await sendAuditReportEmail(
          customer.email,
          audit.url,
          auditId,
          html
        )
        console.log(`Email sent successfully to ${customer.email}`)
      } catch (emailError) {
        console.error('Email sending failed:', emailError)
        // Don't fail the whole audit if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'Audit processed successfully',
        auditId,
        status: 'completed',
      })
    } catch (error) {
      console.error('Error processing audit:', error)
      console.error('Error details:', error instanceof Error ? error.message : String(error))

      // Mark audit as failed
      await supabase
        .from('audits')
        .update({ status: 'failed' })
        .eq('id', auditId)

      // Send failure email
      try {
        const customer = audit.customers as any
        if (customer?.email) {
          await sendAuditFailureEmail(customer.email, audit.url)
        }
      } catch (failureEmailError) {
        console.error('Error sending failure email:', failureEmailError)
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Audit processing failed',
          details: error instanceof Error ? error.message : String(error),
          auditId,
          status: 'failed',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in retry endpoint:', error)
    return NextResponse.json(
      {
        error: 'Failed to retry audit',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

