/**
 * Simple report generator - no LLM, just format the audit data
 * This gets audits working reliably, then we can add LLM back step by step
 */

interface SimpleReportData {
  url: string
  auditId?: string
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
    sampledPages?: Array<{
      url: string
      title?: string
      metaDescription?: string
      wordCount?: number
      h1Count?: number
      issues?: string[]
    }>
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
  performance: 'Page Structure & Efficiency',
  crawl_health: 'Crawl Health',
  on_page: 'On-Page SEO',
  mobile: 'Mobile Optimization',
  local: 'Local SEO',
  accessibility: 'Accessibility',
  security: 'Security',
  schema: 'Schema Markup',
  social: 'Social Metadata',
  competitor_overview: 'Competitor Overview',
  llm_readiness: 'AI Readiness',
}

/**
 * Detect if site uses a dynamic JavaScript framework
 * Checks pageAnalysis for HTML content or uses heuristics from modules
 */
function detectDynamicFramework(modules: any[], pageAnalysis?: any): { framework: string | null; detected: boolean } {
  // Try to get HTML from pageAnalysis if available
  let htmlContent = ''
  if (pageAnalysis?.htmlContent) {
    htmlContent = pageAnalysis.htmlContent
  }
  
  // Also check performance module for script count
  const performanceModule = modules.find(m => m.moduleKey === 'performance')
  const scriptCount = performanceModule?.evidence?.totalScripts || 0
  
  if (htmlContent) {
    const htmlLower = htmlContent.toLowerCase()
    
    // Check for React/Next.js
    if (htmlLower.includes('react') || htmlLower.includes('__next') || htmlLower.includes('next.js') || htmlLower.includes('_next')) {
      return { framework: 'React/Next.js', detected: true }
    }
    // Check for Vue
    if (htmlLower.includes('vue') || htmlLower.includes('__vue__') || htmlLower.includes('vite')) {
      return { framework: 'Vue.js', detected: true }
    }
    // Check for Angular
    if (htmlLower.includes('angular') || htmlLower.includes('ng-') || htmlLower.includes('ngapp')) {
      return { framework: 'Angular', detected: true }
    }
    // Check for Svelte
    if (htmlLower.includes('svelte')) {
      return { framework: 'Svelte', detected: true }
    }
  }
  
  // Heuristic: Many scripts often indicates JS framework
  if (scriptCount > 10) {
    return { framework: 'JavaScript Framework', detected: true }
  }
  
  return { framework: null, detected: false }
}

function getModuleDescription(moduleKey: string): string {
  const descriptions: Record<string, string> = {
    performance: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This evaluates page structure, code efficiency, script loading, and rendering approach. For real-world Core Web Vitals data, connect Google Search Console.</p>',
    crawl_health: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks HTTPS status, robots.txt, sitemap, internal links, and broken links.</p>',
    on_page: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks your page title, description, headings, and content quality.</p>',
    mobile: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks how well your site works on phones and tablets.</p>',
    local: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks for business address, phone, and local business information.</p>',
    accessibility: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks if your site is usable by everyone, including people with disabilities.</p>',
    security: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks HTTPS, security headers, and mixed content issues.</p>',
    schema: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks for structured data that helps search engines understand your content.</p>',
    social: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks Open Graph and Twitter Card tags for social sharing.</p>',
    competitor_overview: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This provides general best practices for competing in your industry.</p>',
    llm_readiness: '<p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks your site\'s readiness for AI-powered search engines and LLM assistants like ChatGPT, Google Gemini, and Perplexity.</p>',
  }
  return descriptions[moduleKey] || ''
}

// Resource cross-links: maps common issue keywords to relevant SEO CheckSite guides
function appendResourceLink(fix: string): string {
  const resourceLinks: Array<{ pattern: RegExp; url: string; text: string }> = [
    { pattern: /meta description/i, url: '/resources/seo-glossary/meta-description', text: 'Learn more about meta descriptions' },
    { pattern: /title.*tag|page title|title length/i, url: '/resources/seo-glossary/title-tag', text: 'Learn more about title tags' },
    { pattern: /heading|h1|h2|h3/i, url: '/resources/website-seo-audit-checklist-for-beginners', text: 'See our SEO checklist for heading best practices' },
    { pattern: /alt text|alt attribute|image.*alt/i, url: '/resources/seo-terms-for-small-business-owners', text: 'Learn about alt text in our SEO glossary' },
    { pattern: /sitemap|xml.*sitemap/i, url: '/resources/seo-glossary/sitemap-xml', text: 'Learn more about sitemaps' },
    { pattern: /robot|noindex|crawl/i, url: '/resources/seo-glossary/robots-txt', text: 'Learn about robots.txt best practices' },
    { pattern: /broken.link/i, url: '/resources/how-to-fix-broken-links', text: 'Step-by-step broken link fix guide' },
    { pattern: /canonical/i, url: '/resources/seo-glossary/canonical-url', text: 'Learn about canonical URLs' },
    { pattern: /schema.*markup|structured.data|ld.\+json/i, url: '/resources/seo-glossary/schema-markup', text: 'Learn about schema markup' },
    { pattern: /https|ssl|certificate|security.*header/i, url: '/resources/how-to-fix-common-seo-issues', text: 'See common SEO fixes guide' },
    { pattern: /redirect|301|302/i, url: '/resources/seo-glossary/crawlability', text: 'Learn about redirect best practices' },
    { pattern: /viewport|mobile.*friend|responsive/i, url: '/resources/best-seo-audit-tools-for-small-business', text: 'See our mobile optimization guide' },
    { pattern: /lazy.load|image.*optim/i, url: '/resources/website-seo-audit-checklist-for-beginners', text: 'See performance tips in our checklist' },
    { pattern: /social.*meta|og:|twitter:/i, url: '/resources/seo-audit-example-for-small-business', text: 'See social metadata in our example audit' },
    { pattern: /content.*length|word.*count|thin.*content/i, url: '/resources/how-to-fix-common-seo-issues', text: 'Tips for improving content quality' },
    { pattern: /ai.*bot|llm.*bot|chatgpt|gptbot/i, url: '/resources/seo-glossary/crawlability', text: 'Learn about AI bot crawlability' },
  ]
  
  for (const link of resourceLinks) {
    if (link.pattern.test(fix)) {
      return fix + `\n\n👉 ${link.text}: https://seochecksite.net${link.url}`
    }
  }
  return fix
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

function generateTeaserReport(auditResult: SimpleReportData): { html: string; plaintext: string } {
  const domain = auditResult.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const highIssues = auditResult.modules.reduce((sum, m) => sum + m.issues.filter(i => i.severity === 'high').length, 0)
  const mediumIssues = auditResult.modules.reduce((sum, m) => sum + m.issues.filter(i => i.severity === 'medium').length, 0)
  const totalIssues = auditResult.modules.reduce((sum, m) => sum + m.issues.length, 0)

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO CheckSite - Website Report Preview</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 20px; background: #f9fafb; }
    .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { color: #0369a1; border-bottom: 3px solid #0ea5e9; padding-bottom: 10px; font-size: 28px; }
    .score-circle { display: inline-block; width: 120px; height: 120px; border-radius: 50%; text-align: center; line-height: 120px; font-size: 36px; font-weight: bold; color: white; margin: 20px 0; }
    .score-high { background: #10b981; }
    .score-medium { background: #f59e0b; }
    .score-low { background: #ef4444; }
    .module-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .module-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; }
    .module-card h3 { margin: 0 0 8px 0; color: #111827; font-size: 16px; }
    .module-score { font-size: 24px; font-weight: bold; }
    .issue-list { margin: 15px 0; padding: 0; list-style: none; }
    .issue-list li { padding: 10px 15px; margin-bottom: 8px; border-left: 4px solid #e5e7eb; background: #f9fafb; border-radius: 4px; font-weight: 500; color: #111827; }
    .issue-list .high { border-left-color: #ef4444; }
    .issue-list .medium { border-left-color: #f59e0b; }
    .issue-list .low { border-left-color: #10b981; }
    .upgrade-box { background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0; }
    .upgrade-box h2 { color: white; margin-top: 0; font-size: 24px; }
    .upgrade-box p { font-size: 16px; margin-bottom: 20px; opacity: 0.9; }
    .upgrade-btn { display: inline-block; background: white; color: #2563eb; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 18px; }
    .upgrade-btn:hover { background: #f0f0f0; }
    .meta { color: #6b7280; font-size: 14px; margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>SEO CheckSite - Website Report Preview</h1>
    <p class="meta">URL: ${escapeHtml(auditResult.url)}</p>
    <p class="meta">Date: ${date}</p>

    <div style="text-align: center;">
      <div class="score-circle ${auditResult.overallScore >= 80 ? 'score-high' : auditResult.overallScore >= 60 ? 'score-medium' : 'score-low'}">
        ${auditResult.overallScore}
      </div>
      <p style="font-size: 18px; color: #374151;">
        ${auditResult.overallScore >= 80 ? 'Your site looks good!' : auditResult.overallScore >= 60 ? 'Some improvements needed' : 'Significant issues found'}
      </p>
    </div>

    <h2>Module Scores</h2>
    <div class="module-grid">
      ${auditResult.modules.map(m => {
        const label = m.moduleKey === 'crawl_health' ? 'Crawl Health' : m.moduleKey.charAt(0).toUpperCase() + m.moduleKey.slice(1).replace(/_/g, ' ')
        return `<div class="module-card">
          <h3>${label}</h3>
          <div class="module-score" style="color: ${m.score >= 80 ? '#10b981' : m.score >= 60 ? '#f59e0b' : '#ef4444'}">${m.score}/100</div>
        </div>`
      }).join('')}
    </div>

    ${totalIssues > 0 ? `
    <h2>Issues Found (${totalIssues})</h2>
    <ul class="issue-list">
      ${auditResult.modules.flatMap(m => m.issues.map(i => 
        `<li class="${i.severity}">${escapeHtml(i.title)}</li>`
      )).join('')}
    </ul>
    ` : '<p style="color: #10b981; font-size: 18px;">No issues found on scanned pages. Great work!</p>'}

    <div class="upgrade-box">
      <h2>Want the Full Fix Plan?</h2>
      <p>Your preview shows what issues exist. Upgrade to get complete fix instructions, evidence details, and a prioritized checklist.</p>
      <a href="https://seochecksite.net/" class="upgrade-btn">Get Full Report — $14.99</a>
    </div>

    <p style="text-align: center; color: #6b7280; font-size: 14px;">
      SEO CheckSite — Plain-language website audits for small business owners
    </p>
  </div>
</body>
</html>`

  const plaintext = `SEO CHECKISTE - WEBSITE REPORT PREVIEW
================================
URL: ${auditResult.url}
Date: ${date}

Overall Score: ${auditResult.overallScore}/100

Module Scores:
${auditResult.modules.map(m => `  ${m.moduleKey.replace(/_/g, ' ')}: ${m.score}/100`).join('\n')}

Issues Found (${totalIssues}):
${auditResult.modules.flatMap(m => m.issues.map(i => `  [${i.severity.toUpperCase()}] ${i.title}`)).join('\n')}

---
Want the full fix plan with detailed instructions?
Visit https://seochecksite.net/ to upgrade for $14.99
---`

  return { html, plaintext }
}

export function generateSimpleReport(auditResult: SimpleReportData, options?: { teaser?: boolean }): { html: string; plaintext: string } {
  // Teaser mode: scores + issue headlines only, no fix details
  if (options?.teaser) {
    return generateTeaserReport(auditResult)
  }

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
    how: appendResourceLink(issue.suggestedFix || 'Review and fix this issue.'),
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

  // Detect dynamic framework
  const frameworkInfo = detectDynamicFramework(auditResult.modules, auditResult.pageAnalysis)
  
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
    frameworkInfo,
    auditId: auditResult.auditId,
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
  auditId?: string
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
  frameworkInfo?: { framework: string | null; detected: boolean }
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
    <!-- Premium Brand Header -->
    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 15px; margin-bottom: 5px; border-bottom: 2px solid #0ea5e9;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #0ea5e9, #0284c7); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.4em; font-weight: 800; color: white;">S</div>
        <div>
          <div style="font-size: 1.2em; font-weight: 700; color: #0369a1; line-height: 1.2;">SEO CheckSite</div>
          <div style="font-size: 0.8em; color: #6b7280;">Website Audit Report</div>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 0.75em; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Report Date</div>
        <div style="font-size: 0.95em; color: #0369a1; font-weight: 600;">${data.date}</div>
      </div>
    </div>
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

    <!-- Analysis Methods Notice -->
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="color: #92400e; font-size: 0.9em; margin: 0; font-weight: 600; margin-bottom: 8px;">📋 About This Analysis</p>
      <p style="color: #78350f; font-size: 0.85em; margin: 0; line-height: 1.5;">
        This audit uses static HTML analysis to check your site's structure, content, and technical SEO fundamentals. JavaScript-rendered content is noted where applicable.
      </p>
      ${data.frameworkInfo?.detected ? `
        <p style="color: #78350f; font-size: 0.85em; margin: 8px 0 0 0; line-height: 1.5;">
          <strong>JavaScript-rendered site detected (${data.frameworkInfo.framework})</strong> — some elements may not appear in static crawl.
        </p>
      ` : ''}
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
        <tr><th>Images</th><td>${data.pageAnalysis.totalImages || 0} total${data.pageAnalysis.missingAltText ? `, ${data.pageAnalysis.missingAltText} missing descriptions` : ''} <span style="color: #6b7280; font-size: 0.85em; font-style: italic;">(Images detected in static HTML only; JavaScript-rendered images are not included.)</span></td></tr>
        <tr><th>Links</th><td>${data.pageAnalysis.internalLinks || 0} internal, ${data.pageAnalysis.externalLinks || 0} external</td></tr>
        <tr><th>HTTPS</th><td>${data.pageAnalysis.isHttps ? 'Yes ✓' : 'No ✗'}</td></tr>
        ${data.pageAnalysis.hasRedirect ? `<tr><th>Redirect</th><td>Yes (redirected from ${escapeHtml(data.pageAnalysis.url)} to ${escapeHtml(data.pageAnalysis.finalUrl || data.pageAnalysis.url)})</td></tr>` : ''}
      </table>
    </div>
    ` : ''}

    ${data.pageAnalysis?.sampledPages && data.pageAnalysis.sampledPages.length > 0 ? `
    <!-- Pages Audited: multi-page scan from sitemap sampling -->
    <h2 id="pages-audited">Pages Audited</h2>
    <div class="summary" style="background: #f0f9ff; border-left-color: #0ea5e9;">
      <p style="margin: 5px 0; color: #374151;">
        <strong>Sitemap Sampling</strong> — We found <strong>${data.pageAnalysis.sampledPages.length}</strong> pages in your sitemap and checked <strong>${data.pageAnalysis.sampledPages.length}</strong> to see how your site\\'s content looks across multiple pages.
      </p>
      <p style="margin: 5px 0; color: #6b7280; font-size: 0.9em;">
        The table below shows key SEO elements from a random sample of pages. This helps catch site-wide patterns that a single-page audit might miss.
      </p>
      <table class="evidence-table" style="margin-top: 15px;">
        <thead>
          <tr>
            <th>Page URL</th>
            <th>Title</th>
            <th>Description</th>
            <th>Words</th>
            <th>Issues</th>
          </tr>
        </thead>
        <tbody>
          ${data.pageAnalysis.sampledPages.map((page: any) => {
            const pageUrl = page.url || ''
            const shortUrl = pageUrl.length > 50 ? pageUrl.substring(0, 50) + '...' : pageUrl
            const title = page.title ? escapeHtml(page.title.substring(0, 60) + (page.title.length > 60 ? '...' : '')) : '<span style="color: #9ca3af; font-style: italic;">Not found</span>'
            const description = page.metaDescription 
              ? escapeHtml(page.metaDescription.substring(0, 80) + (page.metaDescription.length > 80 ? '...' : '')) 
              : '<span style="color: #9ca3af; font-style: italic;">Not found</span>'
            const wordCount = page.wordCount !== undefined ? page.wordCount : '<span style="color: #9ca3af;">N/A</span>'
            
            const issues = page.issues && page.issues.length > 0
              ? page.issues.map((i: string) => `<span style="color: #dc2626; font-size: 0.85em;">⚠ ${escapeHtml(i)}</span>`).join('<br>')
              : '<span style="color: #10b981; font-size: 0.85em;">✓ No issues</span>'
            
            return `<tr${page.issues && page.issues.length > 0 ? ' style="background: #fef2f2;"' : ''}>
              <td style="font-size: 0.85em; word-break: break-all; max-width: 200px;" title="${escapeHtml(pageUrl)}">${escapeHtml(shortUrl)}</td>
              <td style="font-size: 0.85em;">${title}</td>
              <td style="font-size: 0.85em;">${description}</td>
              <td style="text-align: center; font-size: 0.85em;">${wordCount}</td>
              <td style="font-size: 0.85em;">${issues}</td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
      <p style="margin-top: 15px; color: #6b7280; font-size: 0.85em; font-style: italic;">
        Pages are sampled randomly from the sitemap. Additional pages may exist that were not included in this quick scan.
      </p>
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
    <h2 id="quick-fix-checklist">Quick Fix Checklist</h2>
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
        Start with the top ${Math.min(3, data.quickFixChecklist.filter((item: any) => (typeof item === 'object' ? item.severity : 'high') === 'high').length)} "High impact" items — they will move your score the most.
      </p>
      <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 13px;">
        💡 <strong>Tip:</strong> Print this checklist and tick off items as you complete them.
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
        
        ${module.moduleKey === 'performance' ? (module.evidence?.hasPageSpeedData ? `
          <div style="margin: 20px 0; padding: 20px; background: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd;">
            <h4 style="margin-top: 0; margin-bottom: 15px; color: #0369a1;">🚀 Real-world Performance (PageSpeed Insights)</h4>
            <p style="margin-bottom: 15px; color: #374151; font-size: 0.9em;">
              Real-world performance data from Google PageSpeed Insights. These metrics reflect actual user experience.
              ${module.evidence?.pageSpeedStrategy ? `Strategy used: <strong>${module.evidence.pageSpeedStrategy}</strong>.` : ''}
            </p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
              <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                <div style="font-size: 0.75em; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Performance</div>
                <div style="font-size: 1.8em; font-weight: 700; color: ${module.evidence?.pageSpeedScore >= 90 ? '#10b981' : module.evidence?.pageSpeedScore >= 50 ? '#f59e0b' : '#ef4444'};">${module.evidence?.pageSpeedScore ?? '—'}</div>
                <div style="font-size: 0.8em; color: #9ca3af;">/100</div>
              </div>
              <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                <div style="font-size: 0.75em; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">FCP</div>
                <div style="font-size: 1.3em; font-weight: 700; color: #111827;">${module.evidence?.firstContentfulPaint ? `${(module.evidence.firstContentfulPaint / 1000).toFixed(1)}s` : '—'}</div>
                <div style="font-size: 0.75em; color: #9ca3af;">First Contentful Paint</div>
              </div>
              <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                <div style="font-size: 0.75em; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">LCP</div>
                <div style="font-size: 1.3em; font-weight: 700; color: #111827;">${module.evidence?.largestContentfulPaint ? `${(module.evidence.largestContentfulPaint / 1000).toFixed(1)}s` : '—'}</div>
                <div style="font-size: 0.75em; color: #9ca3af;">Largest Contentful Paint</div>
              </div>
              <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                <div style="font-size: 0.75em; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">TBT</div>
                <div style="font-size: 1.3em; font-weight: 700; color: #111827;">${module.evidence?.totalBlockingTime ? `${(module.evidence.totalBlockingTime / 1000).toFixed(1)}s` : '—'}</div>
                <div style="font-size: 0.75em; color: #9ca3af;">Total Blocking Time</div>
              </div>
              <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                <div style="font-size: 0.75em; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">INP</div>
                <div style="font-size: 1.3em; font-weight: 700; color: #111827;">${module.evidence?.interactionToNextPaint ? `${(module.evidence.interactionToNextPaint).toFixed(0)}ms` : '—'}</div>
                <div style="font-size: 0.75em; color: #9ca3af;">Interaction to Next Paint</div>
              </div>
              <div style="text-align: center; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                <div style="font-size: 0.75em; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">CLS</div>
                <div style="font-size: 1.3em; font-weight: 700; color: #111827;">${module.evidence?.cumulativeLayoutShift !== null && module.evidence?.cumulativeLayoutShift !== undefined ? module.evidence.cumulativeLayoutShift.toFixed(3) : '—'}</div>
                <div style="font-size: 0.75em; color: #9ca3af;">Cumulative Layout Shift</div>
              </div>
            </div>
            ${module.evidence?.pageSpeedScore && module.evidence?.pageSpeedScore >= 90 ? '<p style="margin: 15px 0 0 0; color: #10b981; font-weight: 600;">✅ Good — Your page meets Core Web Vitals thresholds.</p>' : ''}
            ${module.evidence?.pageSpeedScore && module.evidence?.pageSpeedScore < 90 && module.evidence?.pageSpeedScore >= 50 ? '<p style="margin: 15px 0 0 0; color: #f59e0b; font-weight: 600;">⚠️ Needs improvement — Your page does not meet all Core Web Vitals thresholds. Focus on the issues below.</p>' : ''}
            ${module.evidence?.pageSpeedScore && module.evidence?.pageSpeedScore < 50 ? '<p style="margin: 15px 0 0 0; color: #ef4444; font-weight: 600;">❌ Poor — Significant performance issues detected. Prioritize the high-severity fixes below.</p>' : ''}
          </div>
        ` : `
          <div style="margin: 20px 0; padding: 20px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
            <h4 style="margin-top: 0; margin-bottom: 10px; color: #b91c1c;">PageSpeed data unavailable for this audit; Performance score below is from static analysis only.</h4>
          </div>
        `) : ''}
        
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
                    const impactLabel = issue.severity === 'high' ? 'HIGH IMPACT' : issue.severity === 'medium' ? 'Medium' : 'Low'
                    const impactColor = issue.severity === 'high' ? '#dc2626' : issue.severity === 'medium' ? '#f59e0b' : '#10b981'
                    const impactBg = issue.severity === 'high' ? '#fee2e2' : issue.severity === 'medium' ? '#fef3c7' : '#d1fae5'
                    const impactIcon = issue.severity === 'high' ? '🔴 ' : issue.severity === 'medium' ? '🟡 ' : '🟢 '
                    
                    return `
                    <tr${issue.severity === 'high' ? ' style="background: #fef2f2;"' : ''}>
                      <td style="font-weight: 600; color: ${issue.severity === 'high' ? '#991b1b' : '#111827'}; vertical-align: top; padding-top: 15px;">${issue.severity === 'high' ? '⚠️ ' : ''}${escapeHtml(issue.title)}</td>
                      <td style="vertical-align: top; padding-top: 15px;">
                        <span style="background: ${impactBg}; color: ${impactColor}; padding: ${issue.severity === 'high' ? '6px 14px' : '4px 10px'}; border-radius: 4px; font-size: ${issue.severity === 'high' ? '0.9em' : '0.85em'}; font-weight: 600; display: inline-block;${issue.severity === 'high' ? ' border: 1px solid #dc2626;' : ''}">
                          ${impactIcon}${impactLabel}
                        </span>
                      </td>
                      <td style="color: #374151; vertical-align: top; padding-top: 15px;">${escapeHtml(issue.plainLanguageExplanation || '')}</td>
                      <td style="color: #374151; vertical-align: top; padding-top: 15px;">${escapeHtml(appendResourceLink(issue.suggestedFix || ''))}</td>
                    </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            `
          }
          
          // Single issue - use detailed card format
          return accessibilityWhyBlock + multipleIssuesNote + module.issues.map((issue: any) => `
            <div class="issue ${issue.severity}"${issue.severity === 'high' ? ' style="border-left-width: 5px; background: #fef2f2;"' : ''}>
              <span class="severity ${issue.severity}" style="${issue.severity === 'high' ? 'font-size: 0.95em; padding: 5px 14px;' : ''}">${issue.severity === 'high' ? '🔴 ' : issue.severity === 'medium' ? '🟡 ' : '🟢 '}${issue.severity.toUpperCase()}${issue.severity === 'high' ? ' — HIGH IMPACT' : ''}</span>
              <h3 style="margin-top: 10px;${issue.severity === 'high' ? ' color: #991b1b;' : ''}">${escapeHtml(issue.title)}</h3>
              <p><strong>Why this matters:</strong> ${escapeHtml(issue.plainLanguageExplanation || '')}</p>
              <p><strong>How to fix it:</strong> ${escapeHtml(appendResourceLink(issue.suggestedFix || ''))}</p>
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

    ${data.screenshots?.desktop || data.screenshots?.mobile ? `
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

        <!-- How You Compare Section -->
    <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 25px; margin: 30px 0; border-radius: 8px;">
      <h2 style="color: #0369a1; margin-top: 0; margin-bottom: 20px; font-size: 1.4em; border: none; padding: 0;">📊 How You Compare</h2>
      
      <p style="color: #374151; font-size: 0.95em; margin-bottom: 20px;">
        Here's how ${escapeHtml(data.domain)} stacks up against typical websites in the same category:
      </p>
      
      <div style="background: white; border-radius: 8px; padding: 20px; border: 1px solid #e5e7eb;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
          <thead>
            <tr style="border-bottom: 2px solid #e5e7eb;">
              <th style="text-align: left; padding: 10px 8px; color: #374151;">Module</th>
              <th style="text-align: center; padding: 10px 8px; color: #0369a1;">Your Score</th>
              <th style="text-align: center; padding: 10px 8px; color: #6b7280;">Typical Range</th>
              <th style="text-align: center; padding: 10px 8px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.modules.map((module: any) => {
              const displayName = MODULE_DISPLAY_NAMES[module.moduleKey] || module.moduleKey
              const score = module.score
              
              let typicalLow = 60, typicalHigh = 85
              if (module.moduleKey === 'performance') { typicalLow = 50; typicalHigh = 80 }
              if (module.moduleKey === 'on_page') { typicalLow = 55; typicalHigh = 85 }
              if (module.moduleKey === 'mobile') { typicalLow = 60; typicalHigh = 90 }
              if (module.moduleKey === 'security') { typicalLow = 70; typicalHigh = 95 }
              if (module.moduleKey === 'crawl_health') { typicalLow = 50; typicalHigh = 80 }
              if (module.moduleKey === 'schema') { typicalLow = 40; typicalHigh = 75 }
              if (module.moduleKey === 'social') { typicalLow = 50; typicalHigh = 80 }
              if (module.moduleKey === 'accessibility') { typicalLow = 45; typicalHigh = 75 }
              if (module.moduleKey === 'local') { typicalLow = 40; typicalHigh = 70 }
              if (module.moduleKey === 'llm_readiness') { typicalLow = 40; typicalHigh = 75 }
              
              let statusEmoji = '🟢'
              if (score < typicalLow) statusEmoji = '🔴'
              else if (score < typicalHigh) statusEmoji = '🟡'
              
              const statusText = score >= typicalHigh ? 'Above average' : score >= typicalLow ? 'Average' : 'Below average'
              const scoreColor = score >= typicalHigh ? '#10b981' : score >= typicalLow ? '#f59e0b' : '#ef4444'
              
              return `
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 12px 8px; color: #374151;">${escapeHtml(displayName)}</td>
                <td style="text-align: center; padding: 12px 8px; font-weight: 700; color: ${scoreColor};">${score}</td>
                <td style="text-align: center; padding: 12px 8px; color: #6b7280;">${typicalLow}-${typicalHigh}</td>
                <td style="text-align: center; padding: 12px 8px; font-size: 0.85em;">${statusEmoji} ${statusText}</td>
              </tr>
              `
            }).join('')}
          </tbody>
        </table>
        <p style="margin: 15px 0 0 0; color: #9ca3af; font-size: 0.8em; font-style: italic;">
          Typical ranges are based on aggregated data from similar small-to-medium business websites. Scores are based on static analysis and PageSpeed data.
        </p>
      </div>
    </div>

    <!-- Track Your Progress Section -->
    <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 25px; margin: 30px 0; border-radius: 8px;">
      <h2 style="color: #065f46; margin-top: 0; margin-bottom: 15px; font-size: 1.4em; border: none; padding: 0;">📈 Track Your Progress</h2>
      
      <div style="background: white; border-radius: 8px; padding: 20px; border: 1px solid #d1fae5;">
        <p style="color: #374151; font-size: 0.95em; margin: 0 0 15px 0; line-height: 1.6;">
          <strong>Run another audit in 30 days</strong> to see how your scores improve after making the recommended changes. SEO improvements compound over time — consistent effort yields the best results.
        </p>
        
        <div style="background: #f9fafb; border-radius: 6px; padding: 15px; margin: 10px 0;">
          <div style="font-weight: 600; color: #065f46; margin-bottom: 8px;">✅ Priority actions for this month:</div>
          <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 0.9em; line-height: 1.8;">
            <li>Fix the high-priority issues listed in this report first</li>
            <li>Update your content with fresh, relevant information</li>
            <li>Ensure your business information is accurate and up to date</li>
          </ul>
        </div>
        
        <p style="color: #6b7280; font-size: 0.9em; margin: 15px 0 0 0; font-style: italic;">
          🎯 Bookmark this report and come back after 30 days to rerun your audit. 
          <a href="https://seochecksite.net" style="color: #10b981; font-weight: 600;">Run another audit →</a>
        </p>
      </div>
    </div>

    <!-- Share This Report Section -->
    <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; border-radius: 12px; margin: 30px 0; color: white;">
      <h2 style="color: white; margin-top: 0; margin-bottom: 20px; font-size: 1.4em; border: none; padding: 0;">📤 Share This Report</h2>
      
      <p style="font-size: 0.95em; opacity: 0.9; margin-bottom: 20px;">
        Your report has a unique URL that you can share with anyone. No login required.
      </p>
      
      <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 15px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <span style="font-size: 0.85em; opacity: 0.8; flex-shrink: 0;">Report URL:</span>
        <code style="background: rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 4px; font-size: 0.85em; word-break: break-all; flex: 1;">
          https://seochecksite.net/report/${data.auditId || '{{AUDIT_ID}}'}
        </code>
      </div>
      
      <div style="display: grid; gap: 12px; margin-bottom: 25px;">
        <div style="background: rgba(255,255,255,0.15); padding: 12px 15px; border-radius: 8px; display: flex; align-items: flex-start; gap: 10px;">
          <span style="font-size: 1.3em; flex-shrink: 0;">👩‍💻</span>
          <div>
            <div style="font-weight: 600; margin-bottom: 2px;">Share with your web designer or developer</div>
            <div style="font-size: 0.85em; opacity: 0.85;">Send them the report link so they can see exactly what needs to be fixed.</div>
          </div>
        </div>
        
        <div style="background: rgba(255,255,255,0.15); padding: 12px 15px; border-radius: 8px; display: flex; align-items: flex-start; gap: 10px;">
          <span style="font-size: 1.3em; flex-shrink: 0;">📋</span>
          <div>
            <div style="font-weight: 600; margin-bottom: 2px;">Email to yourself or your team</div>
            <div style="font-size: 0.85em; opacity: 0.85;">Forward the report link to keep a record of your current baseline.</div>
          </div>
        </div>
        
        <div style="background: rgba(255,255,255,0.15); padding: 12px 15px; border-radius: 8px; display: flex; align-items: flex-start; gap: 10px;">
          <span style="font-size: 1.3em; flex-shrink: 0;">📌</span>
          <div>
            <div style="font-weight: 600; margin-bottom: 2px;">Bookmark to track future progress</div>
            <div style="font-size: 0.85em; opacity: 0.85;">Come back to this report anytime to check your baseline before making changes.</div>
          </div>
        </div>
      </div>
      
      <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; text-align: center; border: 1px dashed rgba(255,255,255,0.3);">
        <p style="margin: 0; font-size: 0.9em;">
          <strong>💬 Need help interpreting these results?</strong>
          <br>
          <span style="opacity: 0.9;">Email us at <a href="mailto:admin@seochecksite.net" style="color: white; text-decoration: underline; font-weight: 600;">admin@seochecksite.net</a> and we'll help you understand the next steps.</span>
        </p>
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
        text += `How to fix it: ${appendResourceLink(issue.suggestedFix || '')}\n\n`
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

