import { NextRequest, NextResponse } from 'next/server'
import { fetchSite } from '@/lib/audit/modules'
import { generateReport } from '@/lib/llm'
import { sendAuditReportEmail } from '@/lib/email-unified'
import { requireAdminAuth } from '@/lib/middleware/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // Require admin authentication
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const { step, url, email } = await request.json()

    if (!step || !url) {
      return NextResponse.json(
        { error: 'Step and URL are required' },
        { status: 400 }
      )
    }

    const results: any = {
      step,
      url,
      timestamp: new Date().toISOString(),
    }

    try {
      switch (step) {
        case 'fetch_site': {
          const startTime = Date.now()
          const siteData = await fetchSite(url)
          const duration = Date.now() - startTime

          results.success = true
          results.duration_ms = duration
          results.data = {
            has_html: !!siteData.html,
            html_length: siteData.html?.length || 0,
            has_title: !!siteData.title,
            title: siteData.title || null,
            has_description: !!siteData.description,
            description: siteData.description || null,
          }
          break
        }

        case 'test_llm': {
          // Test LLM with a simple request
          const testResult = {
            url,
            modules: [
              {
                moduleKey: 'performance',
                score: 85,
                issues: [],
                summary: 'Test summary',
              },
            ],
            overallScore: 85,
          }

          const startTime = Date.now()
          const { html, plaintext } = await generateReport(testResult)
          const duration = Date.now() - startTime

          results.success = true
          results.duration_ms = duration
          results.data = {
            has_html: !!html,
            html_length: html?.length || 0,
            has_plaintext: !!plaintext,
            plaintext_length: plaintext?.length || 0,
          }
          break
        }

        case 'test_email': {
          if (!email) {
            return NextResponse.json(
              { error: 'Email is required for email test' },
              { status: 400 }
            )
          }

          const testHtml = '<h1>Test Report</h1><p>This is a test email.</p>'
          const testAuditId = 'test-' + Date.now()

          const startTime = Date.now()
          await sendAuditReportEmail(email, url, testAuditId, testHtml)
          const duration = Date.now() - startTime

          results.success = true
          results.duration_ms = duration
          results.data = {
            email_sent_to: email,
          }
          break
        }

        default:
          return NextResponse.json(
            { error: `Unknown step: ${step}. Valid steps: fetch_site, test_llm, test_email` },
            { status: 400 }
          )
      }

      return NextResponse.json(results)
    } catch (error) {
      results.success = false
      results.error = error instanceof Error ? error.message : String(error)
      results.error_stack = error instanceof Error ? error.stack : undefined
      results.duration_ms = Date.now() - (results.start_time || Date.now())

      return NextResponse.json(results, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to test audit step',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

