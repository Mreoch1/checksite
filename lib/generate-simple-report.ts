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
  screenshots?: {
    desktop?: string
    mobile?: string
  }
}

const MODULE_DISPLAY_NAMES: Record<string, string> = {
  performance: 'Performance Signals (Static Analysis)',
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
    performance: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This evaluates HTML structure and surface-level performance indicators (not real user speed metrics). Checks image optimization, script loading patterns, and resource structure.</p>',
    crawl_health: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks HTTPS status, robots.txt, sitemap, internal links, and broken links.</p>',
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
  
  // Count issues by severity first (needed for conditional logic)
  const highIssues = auditResult.modules.reduce((sum, m) => sum + m.issues.filter(i => i.severity === 'high').length, 0)
  
  if (auditResult.overallScore >= 80) {
    executiveSummary.push('Your website is in good overall health with strong SEO fundamentals.')
  } else if (auditResult.overallScore >= 60) {
    executiveSummary.push('Your website has room for improvement but shows solid foundations.')
    // Add a "but" statement for clarity when there are high-priority issues
    if (highIssues > 0) {
      executiveSummary.push(`However, you're missing some key elements that will help improve your search visibility and click-through rates.`)
    }
  } else {
    executiveSummary.push('Your website needs attention in several key areas to improve search visibility.')
  }
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
  
  // Quick fix checklist - top 5 high priority issues with severity and effort info
  const quickFixChecklist: Array<{ title: string; severity: string; effort: string }> = []
  const allIssues = auditResult.modules.flatMap((m: any) => m.issues.map((i: any) => ({ ...i, module: m.moduleKey })))
  const highPriorityIssues = allIssues.filter(i => i.severity === 'high').slice(0, 5)
  const seenTitles = new Set<string>()
  
  // Determine effort level based on issue type
  const getEffortLevel = (issue: any): string => {
    const title = issue.title.toLowerCase()
    const fix = (issue.suggestedFix || '').toLowerCase()
    
    // Quick wins - simple changes
    if (title.includes('meta description') || title.includes('title') || 
        title.includes('alt text') || title.includes('heading') ||
        fix.includes('add') || fix.includes('update')) {
      return 'Quick win'
    }
    
    // Requires developer
    if (title.includes('https') || title.includes('ssl') || 
        title.includes('script') || title.includes('lazy loading') ||
        title.includes('redirect') || fix.includes('contact') || fix.includes('developer')) {
      return 'Requires dev'
    }
    
    // Medium effort
    return 'Medium effort'
  }
  
  highPriorityIssues.forEach(issue => {
    if (!seenTitles.has(issue.title)) {
      seenTitles.add(issue.title)
      quickFixChecklist.push({
        title: issue.title,
        severity: issue.severity,
        effort: getEffortLevel(issue),
      })
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
  
  // Calculate score overview summary and module performance summary
  const excellentModules = auditResult.modules.filter(m => m.score >= 90).length
  const goodModules = auditResult.modules.filter(m => m.score >= 75 && m.score < 90).length
  const needsWorkModules = auditResult.modules.filter(m => m.score < 75).length
  
  // Add to executive summary
  if (excellentModules > 0 && auditResult.modules.length === excellentModules) {
    executiveSummary.push(`No critical technical blockers detected in this scan.`)
  } else if (excellentModules > 0) {
    executiveSummary.push(`${excellentModules} of ${auditResult.modules.length} checked areas show no critical issues.`)
  }
  if (needsWorkModules > 0) {
    executiveSummary.push(`${needsWorkModules} area${needsWorkModules > 1 ? 's need' : ' needs'} significant improvement.`)
  }
  
  // Calculate score overview summary text
  const scoreSummaryParts: string[] = []
  if (excellentModules > 0) {
    const moduleNames = auditResult.modules
      .filter(m => m.score >= 90)
      .map(m => MODULE_DISPLAY_NAMES[m.moduleKey] || m.moduleKey)
      .slice(0, 2)
    if (moduleNames.length > 0) {
      scoreSummaryParts.push(`especially strong ${moduleNames.join(' and ')}`)
    }
  }
  if (needsWorkModules > 0) {
    scoreSummaryParts.push(`${needsWorkModules} area${needsWorkModules > 1 ? 's need' : ' needs'} attention`)
  }
  
  const scoreOverviewSummary = scoreSummaryParts.length > 0
    ? `Your site is in ${auditResult.overallScore >= 80 ? 'good' : auditResult.overallScore >= 60 ? 'fair' : 'poor'} overall shape${scoreSummaryParts.length > 0 ? `, with ${scoreSummaryParts.join(' and ')}.` : '.'}`
    : `Your site is performing well across all checked areas.`

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
    screenshots: auditResult.screenshots,
    scoreOverviewSummary,
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
  quickFixChecklist: Array<string | { title: string; severity: string; effort: string }>
  topActions: any[]
  modules: any[]
  overallScore: number
  screenshots?: {
    desktop?: string
    mobile?: string
  }
  scoreOverviewSummary?: string
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
    <!-- Hero Section - Score-Centric -->
    <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 40px; border-radius: 12px; margin: 30px 0; text-align: center; color: white;">
      <div style="font-size: 4em; font-weight: 700; margin-bottom: 10px; line-height: 1;">
        ${data.overallScore}
        <span style="font-size: 0.5em; opacity: 0.9;">/100</span>
      </div>
      <div style="margin-bottom: 15px;">
        <div style="font-size: 2.5em; font-weight: 700; margin-bottom: 5px; opacity: 0.95;">
          ${(() => {
            const score = data.overallScore
            if (score >= 97) return 'A+'
            if (score >= 93) return 'A'
            if (score >= 90) return 'A-'
            if (score >= 87) return 'B+'
            if (score >= 83) return 'B'
            if (score >= 80) return 'B-'
            if (score >= 77) return 'C+'
            if (score >= 73) return 'C'
            if (score >= 70) return 'C-'
            if (score >= 67) return 'D+'
            if (score >= 63) return 'D'
            if (score >= 60) return 'D-'
            return 'F'
          })()}
        </div>
        <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 10px;">SEO Health Grade</div>
      </div>
      <div style="margin-bottom: 20px;">
        <span class="score-badge ${data.overallScore >= 80 ? 'score-high' : data.overallScore >= 60 ? 'score-medium' : 'score-low'}" style="background: rgba(255, 255, 255, 0.2); color: white; border: 2px solid white; font-size: 1.2em; padding: 10px 24px;">
          ${data.overallScore >= 80 ? 'GOOD' : data.overallScore >= 60 ? 'NEEDS IMPROVEMENT' : 'NEEDS WORK'}
        </span>
      </div>
      <h1 style="color: white; border: none; margin: 0; padding: 0; font-size: 1.8em;">Website Report for ${escapeHtml(data.domain)}</h1>
      <div style="margin-top: 15px; opacity: 0.95;">
        <p style="margin: 5px 0; font-size: 0.95em;">${data.date}</p>
      </div>
    </div>

    ${data.pageAnalysis ? `
    <h2 id="page-breakdown">Page Breakdown</h2>
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

    <h2 id="executive-summary">Technical Summary</h2>
    <div class="summary">
      ${data.executiveSummary.map(point => `<p style="margin: 8px 0;">${escapeHtml(point)}</p>`).join('')}
    </div>
    
    <!-- Score Overview -->
    <h2 id="score-overview">Score Overview</h2>
    <div class="summary" style="background: #f9fafb; border-left-color: #6b7280;">
      ${data.scoreOverviewSummary ? `<p style="margin-bottom: 20px; font-size: 1.05em; color: #374151; font-weight: 500;">${escapeHtml(data.scoreOverviewSummary)}</p>` : ''}
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
        ${data.modules.map((module: any) => {
          const displayName = MODULE_DISPLAY_NAMES[module.moduleKey] || module.moduleKey
          const scoreClass = module.score >= 90 ? 'score-high' : module.score >= 75 ? 'score-medium' : 'score-low'
          const scoreLabel = module.score >= 90 ? 'Excellent' : module.score >= 75 ? 'Good' : 'Needs work'
          const scoreColor = module.score >= 90 ? '#065f46' : module.score >= 75 ? '#92400e' : '#991b1b'
          const scoreBg = module.score >= 90 ? '#d1fae5' : module.score >= 75 ? '#fef3c7' : '#fee2e2'
          
          return `
          <div style="background: white; padding: 15px; border-radius: 6px; border-left: 3px solid ${scoreColor};">
            <div style="font-size: 0.9em; color: #6b7280; margin-bottom: 8px;">${escapeHtml(displayName)}</div>
            <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 1.8em; font-weight: 700; color: ${scoreColor};">${module.score}</span>
              <span style="color: #9ca3af; font-size: 1em;">/100</span>
            </div>
            <span style="background: ${scoreBg}; color: ${scoreColor}; padding: 4px 10px; border-radius: 4px; font-size: 0.85em; font-weight: 600; display: inline-block;">
              ${scoreLabel}
            </span>
          </div>
          `
        }).join('')}
      </div>
    </div>

    ${data.quickFixChecklist.length > 0 ? `
    <h2 id="quick-fix-checklist">Priority Actions</h2>
    <div class="summary" style="background: #f0fdf4; border-left-color: #10b981;">
      <ul style="list-style: none; padding-left: 0;">
        ${data.quickFixChecklist.map((item: any) => {
          const severityLabel = item.severity === 'high' ? 'High impact' : item.severity === 'medium' ? 'Medium impact' : 'Low impact'
          const severityColor = item.severity === 'high' ? '#dc2626' : item.severity === 'medium' ? '#f59e0b' : '#10b981'
          const effortColor = item.effort === 'Quick win' ? '#10b981' : item.effort === 'Requires dev' ? '#dc2626' : '#f59e0b'
          
          return `
          <li style="margin: 15px 0; padding: 15px; background: white; border-radius: 6px; border-left: 3px solid ${severityColor}; position: relative;">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <span style="color: #10b981; font-size: 1.3em; flex-shrink: 0; margin-top: 2px;" aria-label="Checkbox">☐</span>
              <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 8px; color: #111827;">${escapeHtml(typeof item === 'string' ? item : item.title)}</div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px;">
                  <span style="background: ${severityColor}15; color: ${severityColor}; padding: 4px 10px; border-radius: 4px; font-size: 0.85em; font-weight: 600;">
                    ${severityLabel}
                  </span>
                  <span style="background: ${effortColor}15; color: ${effortColor}; padding: 4px 10px; border-radius: 4px; font-size: 0.85em; font-weight: 600;">
                    ${typeof item === 'object' && item.effort ? item.effort : 'Medium effort'}
                  </span>
                </div>
              </div>
            </div>
          </li>
          `
        }).join('')}
      </ul>
      <p style="margin-top: 15px; color: #6b7280; font-size: 14px; font-weight: 500;">
        Start with the top ${Math.min(3, data.quickFixChecklist.filter((item: any) => (typeof item === 'object' ? item.severity : 'high') === 'high').length)} "High impact" items; they will move your score the most.
      </p>
    </div>
    ` : ''}

    <h2 id="top-priority-actions">Start Here: Top Priority Actions</h2>
    ${data.topActions.length > 0 ? data.topActions.map((action, idx) => `
      <div class="action ${action.severity}">
        <h3>${idx + 1}. ${escapeHtml(action.title)}</h3>
        <p><strong>Why this matters:</strong> ${escapeHtml(action.why)}</p>
        <p><strong>How to fix it:</strong> ${escapeHtml(action.how)}</p>
      </div>
    `).join('') : '<p>Review the detailed sections below for specific recommendations.</p>'}
    
    <!-- Table of Contents for Detailed Findings -->
    <h2 id="detailed-findings">Detailed Findings</h2>
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
      <p style="margin: 0 0 15px 0; font-weight: 600; color: #374151;">Jump to section:</p>
      <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
        ${data.modules.map((module: any) => {
          const displayName = MODULE_DISPLAY_NAMES[module.moduleKey] || module.moduleKey
          const moduleId = module.moduleKey.replace(/_/g, '-')
          return `<li style="margin: 8px 0;"><a href="#${moduleId}" style="color: #0ea5e9; text-decoration: none;">${escapeHtml(displayName)}</a></li>`
        }).join('')}
      </ul>
    </div>

    ${data.modules.map(module => {
      const displayName = MODULE_DISPLAY_NAMES[module.moduleKey] || module.moduleKey
      const scoreClass = module.score >= 80 ? 'score-high' : module.score >= 60 ? 'score-medium' : 'score-low'
      const scoreLabel = module.score >= 80 ? 'GOOD' : module.score >= 60 ? 'MEDIUM' : 'NEEDS IMPROVEMENT'
      
      return `
      <div class="module-section" id="${module.moduleKey.replace(/_/g, '-')}">
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
        
        ${module.issues && module.issues.length > 0 ? (() => {
          // Add "Why accessibility matters" block for accessibility module with multiple issues
          const isAccessibilityModule = module.moduleKey === 'accessibility'
          const hasMultipleIssues = module.issues.length > 1
          const accessibilityWhyBlock = isAccessibilityModule && hasMultipleIssues
            ? `<div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <h4 style="color: #0369a1; margin-top: 0; margin-bottom: 10px;">Why accessibility matters:</h4>
                <ul style="margin: 0; padding-left: 20px; color: #374151;">
                  <li style="margin-bottom: 8px;"><strong>Users:</strong> Accessibility issues make your site harder to use for people with visual, motor, or cognitive impairments.</li>
                  <li style="margin-bottom: 8px;"><strong>Business:</strong> Fixing them typically improves overall UX and conversion rates for all users.</li>
                  <li style="margin-bottom: 0;"><strong>Risk:</strong> In some regions, sites that ignore basic accessibility can face legal complaints or demand letters.</li>
                </ul>
              </div>`
            : ''
          
          // For social module, add note if there are multiple issues
          const isSocialModule = module.moduleKey === 'social'
          const multipleIssuesNote = isSocialModule && hasMultipleIssues 
            ? '<p style="margin-bottom: 15px; color: #6b7280; font-style: italic;">Several social sharing enhancements are available.</p>'
            : ''
          
          // Use table format for multiple issues, card format for single issue
          if (hasMultipleIssues) {
            return accessibilityWhyBlock + multipleIssuesNote + `
              <table class="evidence-table" style="margin-top: 20px;">
                <thead>
                  <tr>
                    <th style="width: 25%;">Issue</th>
                    <th style="width: 12%;">Impact</th>
                    <th style="width: 28%;">Why this matters</th>
                    <th style="width: 35%;">Suggested fix</th>
                  </tr>
                </thead>
                <tbody>
                  ${module.issues.map((issue: any) => {
                    const impactLabel = issue.severity === 'high' ? 'High' : issue.severity === 'medium' ? 'Medium' : 'Low'
                    const impactColor = issue.severity === 'high' ? '#dc2626' : issue.severity === 'medium' ? '#f59e0b' : '#10b981'
                    const impactBg = issue.severity === 'high' ? '#fee2e2' : issue.severity === 'medium' ? '#fef3c7' : '#d1fae5'
                    
                    return `
                    <tr>
                      <td style="font-weight: 600; color: #111827; vertical-align: top; padding-top: 15px;">${escapeHtml(issue.title)}</td>
                      <td style="vertical-align: top; padding-top: 15px;">
                        <span style="background: ${impactBg}; color: ${impactColor}; padding: 4px 10px; border-radius: 4px; font-size: 0.85em; font-weight: 600; display: inline-block;">
                          ${impactLabel}
                        </span>
                      </td>
                      <td style="color: #374151; vertical-align: top; padding-top: 15px;">${escapeHtml(issue.plainLanguageExplanation || '')}</td>
                      <td style="color: #374151; vertical-align: top; padding-top: 15px;">${escapeHtml(issue.suggestedFix || '')}</td>
                    </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            `
          }
          
          // Single issue - use detailed card format
          return accessibilityWhyBlock + multipleIssuesNote + module.issues.map((issue: any) => `
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
          `).join('')
        })() : (() => {
          // For security module, check if headers are missing before saying "all passed"
          if (module.moduleKey === 'security' && module.evidence && module.evidence.totalMissingHeaders > 0) {
            return '<div class="no-issues" style="color: #6b7280;">Good, but some optional security enhancements are recommended. See details above.</div>'
          }
          return '<div class="no-issues">✓ All checks passed for this category. Your site looks good in this area!</div>'
        })()}
      </div>
    `}).join('')}

    <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
    <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 4px;">
      <p style="color: #065f46; font-size: 1em; margin: 0; font-weight: 500; line-height: 1.6;">
        Overall, your site is in strong shape. Fixing the recommendations above will give you even better performance in search.
      </p>
    </div>

    ${data.screenshots ? `
    <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
    <h2 style="color: #0284c7; margin-top: 40px; margin-bottom: 20px;">Website Snapshot</h2>
    <p style="color: #6b7280; font-size: 0.95em; margin-bottom: 20px;">
      We captured these screenshots of your website during the audit:
    </p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
      ${data.screenshots.desktop ? `
      <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
        <h3 style="color: #374151; font-size: 1em; margin-top: 0; margin-bottom: 10px;">Desktop View</h3>
        <img src="${data.screenshots.desktop}" alt="Desktop view of ${escapeHtml(data.domain)}" style="width: 100%; height: auto; border-radius: 4px; border: 1px solid #e5e7eb;" />
      </div>
      ` : ''}
      ${data.screenshots.mobile ? `
      <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
        <h3 style="color: #374151; font-size: 1em; margin-top: 0; margin-bottom: 10px;">Mobile View</h3>
        <img src="${data.screenshots.mobile}" alt="Mobile view of ${escapeHtml(data.domain)}" style="width: 100%; max-width: 375px; height: auto; border-radius: 4px; border: 1px solid #e5e7eb; margin: 0 auto; display: block;" />
      </div>
      ` : ''}
    </div>
    ` : ''}

    <hr style="margin: 50px 0 30px 0; border: none; border-top: 2px solid #e5e7eb;">
    <div style="background: #f9fafb; padding: 30px; border-radius: 8px; margin: 30px 0;">
      <h2 style="color: #0284c7; margin-top: 0; margin-bottom: 25px; font-size: 1.5em;">SEO Overview</h2>
      
      <div style="margin-bottom: 30px;">
        <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 12px; font-size: 1.2em;">What is SEO?</h3>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0;">
          SEO (Search Engine Optimization) helps people find your business on Google and other search engines. 
          It improves your website's visibility, rankings, traffic, and leads. Your site's performance, structure, 
          content, and local information all affect how well you show up in search results.
        </p>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 12px; font-size: 1.2em;">How to Use This Report</h3>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">
          Follow these steps to get the most value from your audit:
        </p>
        <ol style="color: #374151; font-size: 16px; line-height: 1.8; padding-left: 25px; margin: 0;">
          <li style="margin-bottom: 8px;"><strong>Fix the High Priority Issues</strong> - These have the biggest impact on your visibility and performance.</li>
          <li style="margin-bottom: 8px;"><strong>Work through the Medium Issues</strong> - These improve your long-term growth and rankings.</li>
          <li style="margin-bottom: 8px;"><strong>Keep your site updated</strong> - Fresh content and improved usability help sustain progress.</li>
        </ol>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 12px; font-size: 1.2em;">What to Expect Moving Forward</h3>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0;">
          SEO improvements take time. Small changes can have quick positive effects, while bigger improvements may take 
          weeks or months to show results. Google reviews updates over time, so be patient and consistent. 
          Keep updating your content every 1 to 3 months to maintain momentum.
        </p>
      </div>

      <div style="margin-bottom: 0;">
        <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 12px; font-size: 1.2em;">When to Rerun an Audit</h3>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 12px;">
          Consider running a new audit:
        </p>
        <ul style="color: #374151; font-size: 16px; line-height: 1.8; padding-left: 25px; margin: 0;">
          <li style="margin-bottom: 8px;">After making updates to fix the issues in this report</li>
          <li style="margin-bottom: 8px;">After adding new content or pages</li>
          <li style="margin-bottom: 8px;">After redesigning your site</li>
          <li style="margin-bottom: 8px;">Every 3 months to stay up to date</li>
        </ul>
      </div>
    </div>

    <!-- Footer with Branding -->
    <hr style="margin: 50px 0 30px 0; border: none; border-top: 2px solid #e5e7eb;">
    <div style="text-align: center; padding: 30px 0; border-top: 1px solid #e5e7eb;">
      <div style="margin-bottom: 15px;">
        <h3 style="color: #0369a1; margin: 0; font-size: 1.5em; font-weight: 700;">SEO CheckSite</h3>
      </div>
      <p style="color: #6b7280; font-size: 0.9em; margin: 8px 0;">
        Generated on ${data.date}
      </p>
      <p style="color: #6b7280; font-size: 0.9em; margin: 8px 0;">
        If you notice an error in this report or believe results may be inaccurate, contact us at <a href="mailto:admin@seochecksite.net" style="color: #0ea5e9; text-decoration: none; font-weight: 600;">admin@seochecksite.net</a>
      </p>
      <p style="color: #9ca3af; font-size: 0.85em; margin: 8px 0; line-height: 1.6;">
        <span style="color: #10b981;">✓</span> No login required &nbsp;|&nbsp;
        <span style="color: #10b981;">✓</span> No website access &nbsp;|&nbsp;
        <span style="color: #10b981;">✓</span> Read-only crawl &nbsp;|&nbsp;
        <span style="color: #10b981;">✓</span> Zero data reselling
      </p>
      <p style="color: #9ca3af; font-size: 0.85em; margin-top: 15px;">
        <a href="https://seochecksite.net" style="color: #9ca3af; text-decoration: none;">Visit SEO CheckSite</a> | 
        <a href="https://seochecksite.net" style="color: #9ca3af; text-decoration: none;">Generate Another Report</a>
      </p>
    </div>
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
  quickFixChecklist: Array<string | { title: string; severity: string; effort: string }>
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
      const title = typeof item === 'string' ? item : item.title
      const severity = typeof item === 'object' ? ` [${item.severity.toUpperCase()}]` : ''
      const effort = typeof item === 'object' && item.effort ? ` [${item.effort}]` : ''
      text += `☐ ${title}${severity}${effort}\n`
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
  text += `\nOverall, your site is in strong shape. Fixing the recommendations above will give you even better performance in search.\n\n`
  text += `${'='.repeat(50)}\n`
  text += `This report was generated by SEO CheckSite.\n`
  text += `If you notice an error in this report or believe results may be inaccurate, contact us at admin@seochecksite.net\n`
  
  return text
}

