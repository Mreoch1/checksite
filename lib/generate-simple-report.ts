/**
 * Simple report generator - no LLM, just format the audit data
 * This gets audits working reliably, then we can add LLM back step by step
 */

interface SimpleReportData {
  url: string
  pageAnalysis?: {
    url: string
    finalUrl?: string
    httpStatus?: number
    contentType?: string
    pageSize?: string | null
    hasRedirect?: boolean
    isHttps?: boolean
    title?: string | null
    metaDescription?: string | null
    h1Text?: string | null
    h1Count?: number
    h2Count?: number
    wordCount?: number
    totalImages?: number
    missingAltText?: number
    internalLinks?: number
    externalLinks?: number
    isIndexable?: boolean
  }
  modules: Array<{
    moduleKey: string
    score: number
    issues: Array<{
      title: string
      severity: string
      technicalExplanation: string
      plainLanguageExplanation: string
      suggestedFix: string
      evidence?: any
    }>
    summary: string
    evidence?: any
  }>
  overallScore: number
}

const MODULE_DISPLAY_NAMES: Record<string, string> = {
  performance: 'Performance',
  crawl_health: 'Crawl Health',
  on_page: 'On-Page SEO',
  mobile: 'Mobile Optimization',
  local: 'Local SEO',
  accessibility: 'Accessibility',
  security: 'Security',
  schema: 'Schema Markup',
  social: 'Social Metadata',
  competitor_overview: 'Competitor Overview',
}

function getModuleDescription(moduleKey: string): string {
  const descriptions: Record<string, string> = {
    performance: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This looks at your HTTPS status, images, scripts, and page resources.</p>',
    crawl_health: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks robots.txt, sitemap, internal links, and broken links.</p>',
    on_page: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks your page title, description, headings, and content quality.</p>',
    mobile: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks how well your site works on phones and tablets.</p>',
    local: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks for business address, phone, and local business information.</p>',
    accessibility: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks if your site is usable by everyone, including people with disabilities.</p>',
    security: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks HTTPS, security headers, and mixed content issues.</p>',
    schema: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks for structured data that helps search engines understand your content.</p>',
    social: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks Open Graph and Twitter Card tags for social sharing.</p>',
    competitor_overview: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This provides general best practices for competing in your industry.</p>',
  }
  return descriptions[moduleKey] || ''
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function generateSimpleReport(auditResult: SimpleReportData): { html: string; plaintext: string } {
  const domain = auditResult.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  
  // Calculate executive summary
  const executiveSummary: string[] = []
  if (auditResult.overallScore >= 80) {
    executiveSummary.push('Your website is in good overall health with strong SEO fundamentals.')
  } else if (auditResult.overallScore >= 60) {
    executiveSummary.push('Your website has room for improvement but shows solid foundations.')
  } else {
    executiveSummary.push('Your website needs attention in several key areas to improve search visibility.')
  }
  
  // Count issues by severity
  const highIssues = auditResult.modules.reduce((sum, m) => sum + m.issues.filter(i => i.severity === 'high').length, 0)
  const mediumIssues = auditResult.modules.reduce((sum, m) => sum + m.issues.filter(i => i.severity === 'medium').length, 0)
  const lowIssuesCount = auditResult.modules.reduce((sum, m) => sum + m.issues.filter(i => i.severity === 'low').length, 0)
  const totalIssues = highIssues + mediumIssues + lowIssuesCount
  
  // Add modules checked and total issues
  executiveSummary.push(`We checked ${auditResult.modules.length} areas of your website.`)
  
  // Issue summary
  if (totalIssues === 0) {
    executiveSummary.push('No issues found! Your site is performing well across all checked areas.')
  } else {
    executiveSummary.push(`Found ${totalIssues} issue${totalIssues > 1 ? 's' : ''} total.`)
    if (highIssues > 0) {
      executiveSummary.push(`${highIssues} high-priority issue${highIssues > 1 ? 's' : ''} need${highIssues === 1 ? 's' : ''} immediate attention.`)
    }
    if (mediumIssues > 0) {
      executiveSummary.push(`${mediumIssues} medium-priority issue${mediumIssues > 1 ? 's' : ''} to address.`)
    }
    if (lowIssuesCount > 0 && highIssues === 0 && mediumIssues === 0) {
      executiveSummary.push(`${lowIssuesCount} minor issue${lowIssuesCount > 1 ? 's' : ''} that can be improved over time.`)
    }
  }
  
  // Module performance summary
  const excellentModules = auditResult.modules.filter(m => m.score >= 80).length
  const needsWorkModules = auditResult.modules.filter(m => m.score < 60).length
  
  if (excellentModules > 0) {
    executiveSummary.push(`${excellentModules} of ${auditResult.modules.length} checked areas are performing excellently.`)
  }
  if (needsWorkModules > 0) {
    executiveSummary.push(`${needsWorkModules} area${needsWorkModules > 1 ? 's need' : ' needs'} significant improvement.`)
  }
  
  // Quick fix checklist - top 5 high priority issues (deduplicated by title)
  const quickFixChecklist: string[] = []
  const allIssues = auditResult.modules.flatMap((m: any) => m.issues.map((i: any) => ({ ...i, module: m.moduleKey })))
  const highPriorityIssues = allIssues.filter(i => i.severity === 'high').slice(0, 5)
  const seenTitles = new Set<string>()
  highPriorityIssues.forEach(issue => {
    if (!seenTitles.has(issue.title)) {
      seenTitles.add(issue.title)
      quickFixChecklist.push(issue.title)
    }
  })
  
  // Top actions - prioritize medium+ severity issues, or top 3 if <3 total issues
  // Only include low severity if we have fewer than 3 medium+ issues
  const mediumPlusIssues = allIssues.filter(i => i.severity === 'high' || i.severity === 'medium')
  const lowIssues = allIssues.filter(i => i.severity === 'low')
  
  const uniqueIssues: any[] = []
  const seenActionTitles = new Set<string>()
  
  // First, add medium+ severity issues (up to 5)
  for (const issue of mediumPlusIssues) {
    if (!seenActionTitles.has(issue.title) && uniqueIssues.length < 5) {
      seenActionTitles.add(issue.title)
      uniqueIssues.push(issue)
    }
  }
  
  // If we have fewer than 3 issues total, add low severity issues to fill up to 3
  if (uniqueIssues.length < 3) {
    for (const issue of lowIssues) {
      if (!seenActionTitles.has(issue.title) && uniqueIssues.length < 3) {
        seenActionTitles.add(issue.title)
        uniqueIssues.push(issue)
      }
    }
  }
  
  const topActions = uniqueIssues.map((issue: any) => ({
    title: issue.title,
    why: issue.plainLanguageExplanation || 'This affects your website\'s performance.',
    how: issue.suggestedFix || 'Review and fix this issue.',
    severity: issue.severity,
  }))
  
  // Generate HTML report
  const html = generateHTMLReport({
    domain,
    date,
    url: auditResult.url,
    pageAnalysis: auditResult.pageAnalysis,
    executiveSummary,
    quickFixChecklist,
    topActions,
    modules: auditResult.modules,
    overallScore: auditResult.overallScore,
  })
  
  // Generate plaintext report
  const plaintext = generatePlaintextReport({
    domain,
    date,
    url: auditResult.url,
    pageAnalysis: auditResult.pageAnalysis,
    executiveSummary,
    quickFixChecklist,
    topActions,
    modules: auditResult.modules,
    overallScore: auditResult.overallScore,
  })
  
  return { html, plaintext }
}

function generateHTMLReport(data: {
  domain: string
  date: string
  url: string
  pageAnalysis?: any
  executiveSummary: string[]
  quickFixChecklist: string[]
  topActions: any[]
  modules: any[]
  overallScore: number
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO CheckSite - Website Report</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      max-width: 900px; 
      margin: 0 auto; 
      padding: 20px; 
      background: #f9fafb;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 { 
      color: #0369a1; 
      border-bottom: 3px solid #0ea5e9; 
      padding-bottom: 10px; 
      margin-top: 0;
    }
    h2 { 
      color: #0284c7; 
      margin-top: 40px; 
      margin-bottom: 15px;
      font-size: 1.5em;
    }
    h3 {
      color: #0369a1;
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 1.2em;
    }
    .summary { 
      background: #f0f9ff; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 20px 0; 
      border-left: 4px solid #0ea5e9;
    }
    .action { 
      background: #fff; 
      border-left: 4px solid #0ea5e9; 
      padding: 15px; 
      margin: 15px 0; 
      border-radius: 4px;
    }
    .action.high { border-left-color: #dc2626; }
    .action.medium { border-left-color: #f59e0b; }
    .action.low { border-left-color: #10b981; }
    .module-section {
      margin: 30px 0;
      padding: 20px;
      background: #f9fafb;
      border-radius: 6px;
    }
    .issue { 
      margin: 15px 0; 
      padding: 15px; 
      background: #fff; 
      border-radius: 6px; 
      border-left: 3px solid #e5e7eb;
    }
    .issue.high { border-left-color: #dc2626; }
    .issue.medium { border-left-color: #f59e0b; }
    .issue.low { border-left-color: #10b981; }
    .severity { 
      display: inline-block; 
      padding: 4px 12px; 
      border-radius: 4px; 
      font-size: 0.85em; 
      font-weight: 600; 
      margin-bottom: 10px; 
      text-transform: uppercase;
    }
    .severity.high { background: #fee2e2; color: #991b1b; }
    .severity.medium { background: #fef3c7; color: #92400e; }
    .severity.low { background: #d1fae5; color: #065f46; }
    .no-issues {
      color: #10b981;
      font-weight: 600;
      padding: 10px;
      background: #d1fae5;
      border-radius: 4px;
    }
    .meta-info {
      color: #6b7280;
      font-size: 0.95em;
      margin-bottom: 30px;
    }
    .evidence-table {
      margin: 15px 0;
      border-collapse: collapse;
      width: 100%;
      background: #fff;
      border-radius: 4px;
      overflow: hidden;
    }
    .evidence-table th {
      background: #f3f4f6;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      font-size: 0.9em;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    .evidence-table td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 0.9em;
    }
    .score-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 1.1em;
      margin: 10px 0;
    }
    .score-high { background: #d1fae5; color: #065f46; }
    .score-medium { background: #fef3c7; color: #92400e; }
    .score-low { background: #fee2e2; color: #991b1b; }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; padding: 20px; }
      a[href^="/"] { display: none; }
      .action, .issue { page-break-inside: avoid; }
      h1, h2 { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>SEO CheckSite</h1>
    <div style="margin-bottom: 20px;">
      <a href="/" style="color: #0ea5e9; text-decoration: none; font-weight: 600;">← Back to Home</a>
    </div>
    
    <h1 style="margin-top: 20px;">Website Report</h1>
    <div class="meta-info">
      <p><strong>Website:</strong> ${escapeHtml(data.domain)}</p>
      <p><strong>Date:</strong> ${data.date}</p>
      <p><strong>Overall Score:</strong> 
        <span class="score-badge ${data.overallScore >= 80 ? 'score-high' : data.overallScore >= 60 ? 'score-medium' : 'score-low'}">
          ${data.overallScore}/100
        </span>
      </p>
    </div>

    ${data.pageAnalysis ? `
    <h2>Page Breakdown</h2>
    <div class="summary">
      <table class="evidence-table">
        <tr><th>Page URL</th><td>${escapeHtml(data.pageAnalysis.url || data.url)}</td></tr>
        ${data.pageAnalysis.finalUrl && data.pageAnalysis.finalUrl !== data.pageAnalysis.url ? `<tr><th>Final URL (after redirect)</th><td>${escapeHtml(data.pageAnalysis.finalUrl)}</td></tr>` : ''}
        <tr><th>Page Title</th><td>${escapeHtml(data.pageAnalysis.title || 'Not found')}</td></tr>
        <tr><th>Page Description</th><td>${escapeHtml(data.pageAnalysis.metaDescription || 'Not found')}</td></tr>
        <tr><th>Main Heading (H1)</th><td>${escapeHtml(data.pageAnalysis.h1Text || 'Not found')}</td></tr>
        <tr><th>Word Count</th><td>${data.pageAnalysis.wordCount || 0} words</td></tr>
        <tr><th>Images</th><td>${data.pageAnalysis.totalImages || 0} total${data.pageAnalysis.missingAltText ? `, ${data.pageAnalysis.missingAltText} missing descriptions` : ''}</td></tr>
        <tr><th>Links</th><td>${data.pageAnalysis.internalLinks || 0} internal, ${data.pageAnalysis.externalLinks || 0} external</td></tr>
        <tr><th>HTTPS</th><td>${data.pageAnalysis.isHttps ? 'Yes ✓' : 'No ✗'}</td></tr>
        ${data.pageAnalysis.hasRedirect ? `<tr><th>Redirect</th><td>Yes (redirected from ${escapeHtml(data.pageAnalysis.url)} to ${escapeHtml(data.pageAnalysis.finalUrl || data.pageAnalysis.url)})</td></tr>` : ''}
      </table>
    </div>
    ` : ''}

    <h2>Executive Summary</h2>
    <div class="summary">
      <div style="margin-bottom: 15px;">
        <strong style="color: #0369a1; font-size: 1.1em;">Overall Score: ${data.overallScore}/100</strong>
        <span class="score-badge ${data.overallScore >= 80 ? 'score-high' : data.overallScore >= 60 ? 'score-medium' : 'score-low'}" style="margin-left: 10px;">
          ${data.overallScore >= 80 ? 'GOOD' : data.overallScore >= 60 ? 'NEEDS IMPROVEMENT' : 'NEEDS WORK'}
        </span>
      </div>
      ${data.executiveSummary.map(point => `<p style="margin: 8px 0;">${escapeHtml(point)}</p>`).join('')}
    </div>

    ${data.quickFixChecklist.length > 0 ? `
    <h2>Quick Fix Checklist</h2>
    <div class="summary" style="background: #f0fdf4; border-left-color: #10b981;">
      <ul style="list-style: none; padding-left: 0;">
        ${data.quickFixChecklist.map(item => `
          <li style="margin: 10px 0; padding-left: 30px; position: relative;">
            <span style="position: absolute; left: 0; color: #10b981; font-size: 1.2em;">☐</span>
            ${escapeHtml(item)}
          </li>
        `).join('')}
      </ul>
      <p style="margin-top: 15px; color: #6b7280; font-size: 14px;">Check off each item as you complete it!</p>
    </div>
    ` : ''}

    <h2>Start Here: Top Priority Actions</h2>
    ${data.topActions.length > 0 ? data.topActions.map((action, idx) => `
      <div class="action ${action.severity}">
        <h3>${idx + 1}. ${escapeHtml(action.title)}</h3>
        <p><strong>Why this matters:</strong> ${escapeHtml(action.why)}</p>
        <p><strong>How to fix it:</strong> ${escapeHtml(action.how)}</p>
      </div>
    `).join('') : '<p>Review the detailed sections below for specific recommendations.</p>'}

    ${data.modules.map(module => {
      const displayName = MODULE_DISPLAY_NAMES[module.moduleKey] || module.moduleKey
      const scoreClass = module.score >= 80 ? 'score-high' : module.score >= 60 ? 'score-medium' : 'score-low'
      const scoreLabel = module.score >= 80 ? 'GOOD' : module.score >= 60 ? 'MEDIUM' : 'NEEDS IMPROVEMENT'
      
      return `
      <div class="module-section">
        <h2>${escapeHtml(displayName)}</h2>
        <div style="margin-bottom: 15px;">
          <span class="score-badge ${scoreClass}" style="margin-right: 10px;">${scoreLabel}</span>
          <span style="color: #6b7280; font-size: 0.9em;">Score: ${module.score}/100</span>
        </div>
        <p style="margin-bottom: 15px;">${escapeHtml(module.summary || `This section checks ${displayName.toLowerCase()}.`)}</p>
        ${getModuleDescription(module.moduleKey)}
        
        ${module.evidence && Object.keys(module.evidence).length > 0 ? `
          <div style="margin: 20px 0; padding: 15px; background: #fff; border-radius: 4px; border: 1px solid #e5e7eb;">
            <h4 style="margin-top: 0; color: #374151;">What We Found:</h4>
            <table class="evidence-table">
              ${Object.entries(module.evidence).filter(([k, v]) => v !== null && v !== undefined && v !== '').map(([key, value]) => {
                const safeKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
                let safeValue = ''
                
                // Special handling for schema preview - use <pre> tag for better formatting
                if (key === 'schemaPreview' && typeof value === 'string') {
                  const truncated = value.length > 800 ? value.substring(0, 800) + '...' : value
                  safeValue = `<pre style="white-space: pre-wrap; font-size: 0.85em; background: #f9fafb; padding: 12px; border-radius: 4px; border: 1px solid #e5e7eb; overflow-x: auto; max-width: 100%; margin: 0;">${escapeHtml(truncated)}</pre>`
                } else if (typeof value === 'string') {
                  safeValue = escapeHtml(value.length > 500 ? value.substring(0, 500) + '...' : value)
                } else if (typeof value === 'object' && value !== null) {
                  if (Array.isArray(value)) {
                    safeValue = escapeHtml(value.length > 0 ? value.slice(0, 10).join(', ') + (value.length > 10 ? ` (and ${value.length - 10} more)` : '') : 'None')
                  } else {
                    // For JSON objects, use <pre> tag for better formatting
                    const jsonStr = JSON.stringify(value, null, 2)
                    const truncated = jsonStr.length > 800 ? jsonStr.substring(0, 800) + '...' : jsonStr
                    safeValue = `<pre style="white-space: pre-wrap; font-size: 0.85em; background: #f9fafb; padding: 12px; border-radius: 4px; border: 1px solid #e5e7eb; overflow-x: auto; max-width: 100%; margin: 0;">${escapeHtml(truncated)}</pre>`
                  }
                } else {
                  safeValue = escapeHtml(String(value))
                }
                return `<tr><th style="width: 30%;">${escapeHtml(safeKey)}</th><td>${safeValue}</td></tr>`
              }).join('')}
            </table>
          </div>
        ` : ''}
        
        ${module.issues && module.issues.length > 0 ? module.issues.map((issue: any) => `
          <div class="issue ${issue.severity}">
            <span class="severity ${issue.severity}">${issue.severity.toUpperCase()}</span>
            <h3 style="margin-top: 10px;">${escapeHtml(issue.title)}</h3>
            <p><strong>Why this matters:</strong> ${escapeHtml(issue.plainLanguageExplanation || '')}</p>
            <p><strong>How to fix it:</strong> ${escapeHtml(issue.suggestedFix || '')}</p>
            ${issue.evidence && Object.keys(issue.evidence).length > 0 ? `
              <div style="margin-top: 15px; padding: 15px; background: #f9fafb; border-radius: 4px;">
                <h4>Details:</h4>
                <table class="evidence-table">
                  ${Object.entries(issue.evidence).filter(([k, v]) => v !== null && v !== undefined && v !== '').map(([key, value]) => {
                    const safeKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
                    const safeValue = typeof value === 'string' ? escapeHtml(value.substring(0, 200)) : 
                                     typeof value === 'object' ? escapeHtml(JSON.stringify(value, null, 2).substring(0, 300)) : 
                                     escapeHtml(String(value))
                    return `<tr><th>${escapeHtml(safeKey)}</th><td>${safeValue}</td></tr>`
                  }).join('')}
                </table>
              </div>
            ` : ''}
          </div>
        `).join('') : '<div class="no-issues">✓ All checks passed for this category. Your site looks good in this area!</div>'}
      </div>
    `}).join('')}

    <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
    <p style="color: #6b7280; font-size: 0.9em; text-align: center;">
      This report was generated by SEO CheckSite. For questions, email us at contact@seoauditpro.net. We're here to help!
    </p>
  </div>
</body>
</html>`
}

function generatePlaintextReport(data: {
  domain: string
  date: string
  url: string
  pageAnalysis?: any
  executiveSummary: string[]
  quickFixChecklist: string[]
  topActions: any[]
  modules: any[]
  overallScore: number
}): string {
  let text = `SEO CHECKSITE - WEBSITE REPORT\n`
  text += `${'='.repeat(50)}\n\n`
  text += `Website: ${data.domain}\n`
  text += `Date: ${data.date}\n`
  text += `Overall Score: ${data.overallScore}/100\n\n`
  
  if (data.pageAnalysis) {
    text += `PAGE BREAKDOWN\n`
    text += `${'='.repeat(50)}\n`
    text += `URL: ${data.pageAnalysis.url || data.url}\n`
    if (data.pageAnalysis.title) text += `Title: ${data.pageAnalysis.title}\n`
    if (data.pageAnalysis.metaDescription) text += `Description: ${data.pageAnalysis.metaDescription}\n`
    if (data.pageAnalysis.h1Text) text += `H1: ${data.pageAnalysis.h1Text}\n`
    text += `Word Count: ${data.pageAnalysis.wordCount || 0}\n`
    text += `Images: ${data.pageAnalysis.totalImages || 0} total, ${data.pageAnalysis.missingAltText || 0} missing alt text\n`
    text += `Links: ${data.pageAnalysis.internalLinks || 0} internal, ${data.pageAnalysis.externalLinks || 0} external\n`
    text += `HTTPS: ${data.pageAnalysis.isHttps ? 'Yes' : 'No'}\n\n`
  }
  
  text += `EXECUTIVE SUMMARY\n`
  text += `${'='.repeat(50)}\n`
  text += `Overall Score: ${data.overallScore}/100\n`
  text += `${data.overallScore >= 80 ? 'GOOD' : data.overallScore >= 60 ? 'NEEDS IMPROVEMENT' : 'NEEDS WORK'}\n\n`
  data.executiveSummary.forEach(point => {
    text += `• ${point}\n`
  })
  text += `\n`
  
  if (data.quickFixChecklist.length > 0) {
    text += `QUICK FIX CHECKLIST\n`
    text += `${'='.repeat(50)}\n`
    data.quickFixChecklist.forEach((item, idx) => {
      text += `☐ ${item}\n`
    })
    text += `\n`
  }
  
  text += `TOP PRIORITY ACTIONS\n`
  text += `${'='.repeat(50)}\n`
  data.topActions.forEach((action, idx) => {
    text += `\n${idx + 1}. ${action.title}\n`
    text += `   Why this matters: ${action.why}\n`
    text += `   How to fix it: ${action.how}\n`
  })
  text += `\n`
  
  data.modules.forEach(module => {
    const displayName = MODULE_DISPLAY_NAMES[module.moduleKey] || module.moduleKey
    text += `\n${displayName.toUpperCase()}\n`
    text += `${'='.repeat(50)}\n`
    text += `${module.summary || `This section checks ${displayName.toLowerCase()}.`}\n\n`
    if (module.issues && module.issues.length > 0) {
      module.issues.forEach((issue: any) => {
        text += `[${issue.severity.toUpperCase()}] ${issue.title}\n`
        text += `Why this matters: ${issue.plainLanguageExplanation || ''}\n`
        text += `How to fix it: ${issue.suggestedFix || ''}\n\n`
      })
    } else {
      text += `✓ All checks passed for this category.\n\n`
    }
  })
  
  text += `${'='.repeat(50)}\n`
  text += `This report was generated by SEO CheckSite.\n`
  text += `For questions, email us at contact@seoauditpro.net. We're here to help!\n`
  
  return text
}

