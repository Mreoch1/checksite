/**
 * DeepSeek LLM integration
 * Assumes OpenAI-compatible API
 */

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''

// Only validate at runtime when actually used
if (!DEEPSEEK_API_KEY && typeof window === 'undefined') {
  console.warn('DEEPSEEK_API_KEY environment variable is not set - LLM features will not work')
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
  const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`DeepSeek API error: ${error}`)
  }

  const data: DeepSeekResponse = await response.json()
  return data.choices[0]?.message?.content || ''
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
  const prompt = `You classify what SEO checks a small website owner needs.

Website URL: ${url}
Title: ${siteSummary.title || 'Not found'}
Description: ${siteSummary.description || 'Not found'}
Content sample: ${(siteSummary.content || '').substring(0, 500)}

Analyze this website and determine which optional SEO modules would be valuable:

1. local - Does this appear to be a local business (restaurant, service, store)?
2. accessibility - Should accessibility be checked?
3. security - Should security be verified?
4. schema - Would structured data help this business?
5. social - Would social media sharing optimization help?
6. competitor_overview - Would competitor analysis be valuable?

Respond with ONLY valid JSON in this exact format:
{
  "local": true/false,
  "accessibility": true/false,
  "security": true/false,
  "schema": true/false,
  "social": true/false,
  "competitor_overview": true/false,
  "reasons": {
    "local": "one sentence reason",
    "accessibility": "one sentence reason",
    "security": "one sentence reason",
    "schema": "one sentence reason",
    "social": "one sentence reason",
    "competitor_overview": "one sentence reason"
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
  const prompt = `You write clear, plain language SEO reports for non-technical business owners.

Website URL: ${auditResult.url}

Audit Results:
${JSON.stringify(auditResult.modules, null, 2)}

Write a comprehensive SEO report with these requirements:

1. Executive Summary (3-5 bullet points)
   - Overall health of the website
   - Main strengths and weaknesses
   - Priority actions

2. "Start Here" Section
   - Top 5 most important fixes
   - Why each matters in plain language
   - Simple step-by-step instructions

3. Module-by-Module Sections
   - For each module, provide:
     * A brief overview sentence
     * 3-7 key issues (prioritized: High, Medium, Low)
     * For each issue:
       - Plain language title
       - "Why this matters" (one sentence)
       - "How to fix it" (short steps a normal person can follow or hand to a web designer)

Constraints:
- Avoid SEO jargon. If you must use technical terms, explain them simply.
- Use short sentences.
- Write as if explaining to a friend who owns a small business.
- Group issues by priority: High, Medium, Low.
- Be encouraging and actionable.

Respond with JSON in this format:
{
  "executiveSummary": ["bullet point 1", "bullet point 2", ...],
  "topActions": [
    {
      "title": "Fix title",
      "why": "Why this matters",
      "how": "Step-by-step instructions"
    }
  ],
  "modules": [
    {
      "moduleName": "Performance",
      "overview": "One sentence overview",
      "issues": [
        {
          "title": "Plain language title",
          "severity": "high/medium/low",
          "why": "Why this matters",
          "how": "How to fix it"
        }
      ]
    }
  ]
}`

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

  const response = await callDeepSeek(messages, 0.5)
  
  // Extract JSON
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Invalid JSON response from DeepSeek')
  }

  const reportData = JSON.parse(jsonMatch[0])

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
  <title>Website Report - ${domain}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #0369a1; border-bottom: 3px solid #0ea5e9; padding-bottom: 10px; }
    h2 { color: #0284c7; margin-top: 30px; }
    .summary { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .summary ul { margin: 10px 0; padding-left: 20px; }
    .action { background: #fff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 15px 0; }
    .action.high { border-left-color: #dc2626; }
    .action.medium { border-left-color: #f59e0b; }
    .action.low { border-left-color: #10b981; }
    .issue { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 6px; }
    .severity { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 0.85em; font-weight: 600; margin-bottom: 10px; }
    .severity.high { background: #fee2e2; color: #991b1b; }
    .severity.medium { background: #fef3c7; color: #92400e; }
    .severity.low { background: #d1fae5; color: #065f46; }
  </style>
</head>
<body>
  <h1>Website Report</h1>
  <p><strong>Website:</strong> ${domain}</p>
  <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>

  <h2>Executive Summary</h2>
  <div class="summary">
    <ul>
      ${reportData.executiveSummary.map((point: string) => `<li>${point}</li>`).join('')}
    </ul>
  </div>

  <h2>Start Here: Top Priority Actions</h2>
  ${reportData.topActions.map((action: any, idx: number) => `
    <div class="action ${action.severity || 'high'}">
      <h3>${idx + 1}. ${action.title}</h3>
      <p><strong>Why this matters:</strong> ${action.why}</p>
      <p><strong>How to fix it:</strong> ${action.how}</p>
    </div>
  `).join('')}

  ${reportData.modules.map((module: any) => `
    <h2>${module.moduleName}</h2>
    <p>${module.overview}</p>
    ${module.issues.map((issue: any) => `
      <div class="issue">
        <span class="severity ${issue.severity}">${issue.severity.toUpperCase()}</span>
        <h3>${issue.title}</h3>
        <p><strong>Why this matters:</strong> ${issue.why}</p>
        <p><strong>How to fix it:</strong> ${issue.how}</p>
      </div>
    `).join('')}
  `).join('')}

  <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
  <p style="color: #6b7280; font-size: 0.9em;">This report was generated by SiteCheck. For questions, contact support.</p>
</body>
</html>`
}

function generatePlaintextReport(reportData: any, url: string): string {
  const domain = new URL(url).hostname
  
  let text = `WEBSITE REPORT\n`
  text += `Website: ${domain}\n`
  text += `Date: ${new Date().toLocaleDateString()}\n\n`
  text += `EXECUTIVE SUMMARY\n`
  text += `${'='.repeat(50)}\n`
  reportData.executiveSummary.forEach((point: string) => {
    text += `• ${point}\n`
  })
  text += `\nSTART HERE: TOP PRIORITY ACTIONS\n`
  text += `${'='.repeat(50)}\n`
  reportData.topActions.forEach((action: any, idx: number) => {
    text += `\n${idx + 1}. ${action.title}\n`
    text += `   Why this matters: ${action.why}\n`
    text += `   How to fix it: ${action.how}\n`
  })
  reportData.modules.forEach((module: any) => {
    text += `\n${module.moduleName.toUpperCase()}\n`
    text += `${'='.repeat(50)}\n`
    text += `${module.overview}\n\n`
    module.issues.forEach((issue: any) => {
      text += `[${issue.severity.toUpperCase()}] ${issue.title}\n`
      text += `Why this matters: ${issue.why}\n`
      text += `How to fix it: ${issue.how}\n\n`
    })
  })
  return text
}

