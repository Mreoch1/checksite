/**
 * DeepSeek LLM integration
 * Assumes OpenAI-compatible API
 */

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'

// Get API key at runtime, not at module load time
function getDeepSeekApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) {
    throw new Error('DEEPSEEK_API_KEY environment variable is required')
  }
  return key
}

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export async function callDeepSeek(
  messages: DeepSeekMessage[],
  temperature: number = 0.7
): Promise<string> {
  // Add timeout to prevent hanging (2.5 minutes for LLM response)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    console.error('DeepSeek API timeout: Request taking longer than 2.5 minutes, aborting...')
    controller.abort()
  }, 150000) // 2.5 minutes

  try {
    const apiKey = getDeepSeekApiKey()
    const requestBody = {
      model: 'deepseek-chat',
      messages,
      temperature,
      max_tokens: 8000, // Limit response size to prevent hanging
      stream: false, // Ensure we get complete response
    }
    const requestBodySize = JSON.stringify(requestBody).length
    
    console.log('Calling DeepSeek API...')
    console.log(`Request body size: ${requestBodySize} characters (${(requestBodySize / 1024).toFixed(1)} KB)`)
    console.log(`Number of messages: ${messages.length}`)
    const startTime = Date.now()
    
    // Use Promise.race to ensure timeout works even if fetch hangs
    const fetchPromise = fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    // Race between fetch and timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        controller.abort()
        reject(new Error('DeepSeek API timeout: Request took longer than 2.5 minutes'))
      }, 150000)
    })

    console.log('Waiting for DeepSeek API response...')
    const response = await Promise.race([fetchPromise, timeoutPromise])
    clearTimeout(timeoutId)
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`DeepSeek API response received in ${duration}s`)

    if (!response.ok) {
      const error = await response.text()
      console.error('DeepSeek API error response:', error)
      throw new Error(`DeepSeek API error: ${error}`)
    }

    const data: DeepSeekResponse = await response.json()
    const content = data.choices[0]?.message?.content || ''
    console.log(`DeepSeek API returned ${content.length} characters`)
    return content
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'))) {
      console.error('DeepSeek API timeout after 2.5 minutes')
      throw new Error('DeepSeek API timeout: Request took longer than 2.5 minutes')
    }
    console.error('DeepSeek API error:', error)
    throw error
  }
}

/**
 * Recommend modules based on website analysis
 */
export async function recommendModules(
  url: string,
  siteSummary: { title?: string; description?: string; content?: string }
): Promise<{
  local: boolean
  accessibility: boolean
  security: boolean
  schema: boolean
  social: boolean
  competitor_overview: boolean
  reasons: Record<string, string>
}> {
  const prompt = `You are an SEO expert helping a non-technical website owner understand what SEO checks they need.

Website URL: ${url}
Title: ${siteSummary.title || 'Not found'}
Description: ${siteSummary.description || 'Not found'}
Content sample: ${(siteSummary.content || '').substring(0, 500)}

Analyze this website and determine which optional SEO modules would be valuable. For EACH module, provide a clear explanation:

1. local - Does this appear to be a local business (restaurant, service, store, local service provider)?
2. accessibility - Should accessibility be checked? (Important for all sites, but especially if serving diverse audiences)
3. security - Should security be verified? (Important for all sites, especially if handling any user data)
4. schema - Would structured data help this business? (Helps search engines understand business info)
5. social - Would social media sharing optimization help? (Important if site content is shared on social platforms)
6. competitor_overview - Would competitor analysis be valuable? (Useful for businesses in competitive markets)

CRITICAL: For each module, provide a clear explanation:
- If RECOMMENDED (true): Explain WHY it's valuable for this specific site (e.g., "Your site appears to be a local business, so local SEO will help customers find you in local search results.")
- If NOT RECOMMENDED (false): Explain WHY it's not needed. MUST start with "Your site doesn't appear to need [module name] because..." (e.g., "Your site doesn't appear to need a local SEO audit because it's an online-only business without a physical location or local service area.")

IMPORTANT: Be accurate with your recommendations:
- Set local to FALSE if the site is purely digital/online with no physical location or local service area
- Set local to TRUE only if there's evidence of a physical location, local service area, or local business model
- Be consistent: if your explanation says the site doesn't need something, set that module to FALSE

Be specific and helpful. The user needs to understand why you're making each recommendation.

Respond with ONLY valid JSON in this exact format:
{
  "local": true/false,
  "accessibility": true/false,
  "security": true/false,
  "schema": true/false,
  "social": true/false,
  "competitor_overview": true/false,
  "reasons": {
    "local": "Clear explanation - if false, start with 'Your site doesn't appear to need a local SEO audit because...'",
    "accessibility": "Clear explanation - if false, start with 'Your site doesn't appear to need an accessibility audit because...'",
    "security": "Clear explanation - if false, start with 'Your site doesn't appear to need a security audit because...'",
    "schema": "Clear explanation - if false, start with 'Your site doesn't appear to need schema markup because...'",
    "social": "Clear explanation - if false, start with 'Your site doesn't appear to need social metadata optimization because...'",
    "competitor_overview": "Clear explanation - if false, start with 'Your site doesn't appear to need competitor analysis because...'"
  }
}`

  const messages: DeepSeekMessage[] = [
    {
      role: 'system',
      content: 'You are an SEO expert who helps non-technical website owners understand what checks they need. Always respond with valid JSON only.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ]

  const response = await callDeepSeek(messages, 0.3)
  
  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Invalid JSON response from DeepSeek')
  }

  return JSON.parse(jsonMatch[0])
}

/**
 * Rewrite audit results into a beginner-friendly report
 */
export async function generateReport(auditResult: {
  url: string
  modules: Array<{
    moduleKey: string
    score: number
    issues: Array<{
      title: string
      severity: string
      technicalExplanation: string
      plainLanguageExplanation: string
      suggestedFix: string
    }>
    summary: string
  }>
}): Promise<{ html: string; plaintext: string }> {
  // Map module keys to display names
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

  // Optimize prompt size - only include essential data
  const optimizedModules = auditResult.modules.map(m => ({
    moduleKey: m.moduleKey,
    score: m.score,
    summary: m.summary,
    issues: m.issues.map(i => ({
      title: i.title,
      severity: i.severity,
      plainLanguageExplanation: i.plainLanguageExplanation,
      suggestedFix: i.suggestedFix,
    })),
  }))

  const prompt = `You write clear, plain language SEO reports for non-technical business owners.

Website URL: ${auditResult.url}

Audit Results (ALL modules that were checked):
${JSON.stringify(optimizedModules, null, 2)}

CRITICAL REQUIREMENTS:
1. You MUST include EVERY module from the audit results in your report. Do not skip any.
2. For each module, use the exact moduleKey to map to the display name:
   - "performance" → "Performance"
   - "crawl_health" → "Crawl Health"
   - "on_page" → "On-Page SEO"
   - "mobile" → "Mobile Optimization"
   - "local" → "Local SEO"
   - "accessibility" → "Accessibility"
   - "security" → "Security"
   - "schema" → "Schema Markup"
   - "social" → "Social Metadata"
   - "competitor_overview" → "Competitor Overview"

3. Executive Summary (3-5 bullet points):
   - Overall health assessment
   - 3 main strengths
   - 3 main weaknesses
   - Top priorities in plain language

4. "Start Here: Top Priority Actions" Section:
   - Exactly 5 most important fixes (prioritize High severity issues)
   - For each: title, why it matters (one sentence), how to fix it (simple steps)

5. Module-by-Module Sections (MANDATORY - include ALL modules):
   - You MUST include EVERY SINGLE module from the audit results. Count them first.
   - For EACH module in the audit results (check the moduleKey field):
     * Use the exact display name from the mapping above (e.g., "on_page" → "On-Page SEO")
     * Provide a brief overview sentence (1-2 sentences)
     * List ALL issues from the module results (include all issues, not just 1-3)
     * If a module has NO issues, include: "All checks passed for this category."
     * For each issue:
       - Use the exact title from the results
       - Use the severity from results (high/medium/low)
       - Use plainLanguageExplanation as "why this matters"
       - Use suggestedFix as "how to fix it"
   - Before finishing, verify you have included ALL modules. Count the modules in audit results and ensure your response has the same number.

6. NEVER include:
   - "Coming soon" messages
   - Empty sections
   - Placeholder text
   - Technical jargon without explanation

7. If a module has no issues, still include it with:
   - Overview sentence
   - "All checks passed for this category."

Tone: Simple, friendly, encouraging. Write as if explaining to a friend who owns a small business.

Respond with ONLY valid JSON in this exact format:
{
  "executiveSummary": ["bullet point 1", "bullet point 2", "bullet point 3", "bullet point 4", "bullet point 5"],
  "topActions": [
    {
      "title": "Fix title",
      "why": "Why this matters in one sentence",
      "how": "Simple step-by-step instructions"
    }
  ],
  "modules": [
    {
      "moduleName": "Performance",
      "overview": "One sentence about what this category checks",
      "issues": [
        {
          "title": "Issue title from results",
          "severity": "high",
          "why": "Why this matters",
          "how": "How to fix it"
        }
      ]
    }
  ]
}

IMPORTANT: Include ALL modules from the audit results. Do not skip any.`

  const messages: DeepSeekMessage[] = [
    {
      role: 'system',
      content: 'You are a friendly SEO consultant who writes clear, actionable reports for non-technical business owners. Always respond with valid JSON only.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ]

  console.log(`Calling DeepSeek with ${auditResult.modules.length} modules...`)
  console.log(`Prompt size: ${JSON.stringify(messages).length} characters`)
  
  const response = await callDeepSeek(messages, 0.5)
  console.log(`DeepSeek response received, length: ${response.length} characters`)
  
  // Extract JSON
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('No JSON found in response. Response preview:', response.substring(0, 500))
    throw new Error('Invalid JSON response from DeepSeek')
  }

  console.log('Parsing JSON response...')
  const reportData = JSON.parse(jsonMatch[0])
  console.log('JSON parsed successfully')

  // Ensure all modules from audit are included
  const moduleDisplayNames: Record<string, string> = {
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

  // CRITICAL: Check if all modules are present, add missing ones
  // This ensures customers get everything they paid for
  const reportedModuleNames = new Set(
    (reportData.modules || []).map((m: any) => 
      (m.moduleName || '').toLowerCase().trim()
    )
  )
  const auditModuleKeys = auditResult.modules.map(m => m.moduleKey)
  
  console.log('Checking for missing modules...')
  console.log('Audit modules:', auditModuleKeys)
  console.log('Reported modules:', Array.from(reportedModuleNames))
  
  for (const moduleKey of auditModuleKeys) {
    const displayName = moduleDisplayNames[moduleKey] || moduleKey
    const displayNameLower = displayName.toLowerCase().trim()
    
    // Check if module is missing (case-insensitive)
    if (!reportedModuleNames.has(displayNameLower)) {
      console.log(`⚠️  Missing module detected: ${displayName} (${moduleKey}) - adding it`)
      
      // Module missing from report, add it
      const moduleResult = auditResult.modules.find(m => m.moduleKey === moduleKey)
      if (moduleResult) {
        if (!reportData.modules) reportData.modules = []
        reportData.modules.push({
          moduleName: displayName,
          overview: moduleResult.summary || `This section checks ${displayName.toLowerCase()}.`,
          issues: moduleResult.issues.length > 0 
            ? moduleResult.issues.map(issue => ({
                title: issue.title,
                severity: issue.severity,
                why: issue.plainLanguageExplanation,
                how: issue.suggestedFix,
              }))
            : [{
                title: 'All checks passed',
                severity: 'low',
                why: 'This category is in good shape.',
                how: 'No action needed for this category.',
              }],
        })
        console.log(`✅ Added missing module: ${displayName}`)
      } else {
        console.error(`❌ Module result not found for ${moduleKey}`)
      }
    }
  }
  
  // Final verification
  const finalModuleCount = reportData.modules?.length || 0
  const expectedModuleCount = auditModuleKeys.length
  if (finalModuleCount !== expectedModuleCount) {
    console.error(`❌ Module count mismatch! Expected ${expectedModuleCount}, got ${finalModuleCount}`)
    throw new Error(`Report is missing modules. Expected ${expectedModuleCount} modules, but only ${finalModuleCount} are in the report.`)
  }
  
  console.log(`✅ All ${expectedModuleCount} modules verified in report`)

  // Generate HTML report
  const html = generateHTMLReport(reportData, auditResult.url)
  
  // Generate plaintext report
  const plaintext = generatePlaintextReport(reportData, auditResult.url)

  return { html, plaintext }
}

function generateHTMLReport(reportData: any, url: string): string {
  const domain = new URL(url).hostname
  
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
    .summary ul { 
      margin: 10px 0; 
      padding-left: 20px; 
    }
    .summary li {
      margin: 8px 0;
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
    .module-section h2 {
      margin-top: 0;
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
  <p><strong>Website:</strong> ${domain}</p>
  <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
    </div>

  <h2>Executive Summary</h2>
  <div class="summary">
      ${reportData.executiveSummary ? reportData.executiveSummary.map((point: string) => `<p>${point}</p>`).join('') : '<p>Your website audit is complete. Review the sections below for detailed findings.</p>'}
  </div>

  <h2>Start Here: Top Priority Actions</h2>
    ${reportData.topActions && reportData.topActions.length > 0 ? reportData.topActions.map((action: any, idx: number) => `
    <div class="action ${action.severity || 'high'}">
      <h3>${idx + 1}. ${action.title}</h3>
      <p><strong>Why this matters:</strong> ${action.why}</p>
      <p><strong>How to fix it:</strong> ${action.how}</p>
    </div>
    `).join('') : '<p>Review the detailed sections below for specific recommendations.</p>'}

    ${reportData.modules && reportData.modules.length > 0 ? reportData.modules.map((module: any) => `
      <div class="module-section">
    <h2>${module.moduleName}</h2>
        <p style="margin-bottom: 15px;">${module.overview || 'This section checks ' + module.moduleName.toLowerCase() + '.'}</p>
        ${module.issues && module.issues.length > 0 ? module.issues.map((issue: any) => `
          <div class="issue ${issue.severity}">
        <span class="severity ${issue.severity}">${issue.severity.toUpperCase()}</span>
            <h3 style="margin-top: 10px;">${issue.title}</h3>
        <p><strong>Why this matters:</strong> ${issue.why}</p>
        <p><strong>How to fix it:</strong> ${issue.how}</p>
          </div>
        `).join('') : '<div class="no-issues">✓ All checks passed for this category.</div>'}
      </div>
    `).join('') : '<p>No module data available.</p>'}

  <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
    <p style="color: #6b7280; font-size: 0.9em; text-align: center;">
      This report was generated by SEO CheckSite. For questions, contact support.
    </p>
  </div>
</body>
</html>`
}

function generatePlaintextReport(reportData: any, url: string): string {
  const domain = new URL(url).hostname
  
  let text = `SEO CHECKSITE - WEBSITE REPORT\n`
  text += `${'='.repeat(50)}\n\n`
  text += `Website: ${domain}\n`
  text += `Date: ${new Date().toLocaleDateString()}\n\n`
  
  text += `EXECUTIVE SUMMARY\n`
  text += `${'='.repeat(50)}\n`
  if (reportData.executiveSummary && reportData.executiveSummary.length > 0) {
  reportData.executiveSummary.forEach((point: string) => {
    text += `• ${point}\n`
  })
  } else {
    text += `Your website audit is complete. Review the sections below for detailed findings.\n`
  }
  
  text += `\nSTART HERE: TOP PRIORITY ACTIONS\n`
  text += `${'='.repeat(50)}\n`
  if (reportData.topActions && reportData.topActions.length > 0) {
  reportData.topActions.forEach((action: any, idx: number) => {
    text += `\n${idx + 1}. ${action.title}\n`
    text += `   Why this matters: ${action.why}\n`
    text += `   How to fix it: ${action.how}\n`
  })
  } else {
    text += `Review the detailed sections below for specific recommendations.\n`
  }
  
  if (reportData.modules && reportData.modules.length > 0) {
  reportData.modules.forEach((module: any) => {
    text += `\n${module.moduleName.toUpperCase()}\n`
    text += `${'='.repeat(50)}\n`
      text += `${module.overview || 'This section checks ' + module.moduleName.toLowerCase() + '.'}\n\n`
      if (module.issues && module.issues.length > 0) {
    module.issues.forEach((issue: any) => {
      text += `[${issue.severity.toUpperCase()}] ${issue.title}\n`
      text += `Why this matters: ${issue.why}\n`
      text += `How to fix it: ${issue.how}\n\n`
    })
      } else {
        text += `✓ All checks passed for this category.\n\n`
      }
  })
  }
  
  text += `\n${'='.repeat(50)}\n`
  text += `This report was generated by SEO CheckSite.\n`
  
  return text
}


