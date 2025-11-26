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
  // Add timeout to prevent hanging (2 minutes for LLM response - reduced for faster failure)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    console.error('DeepSeek API timeout: Request taking longer than 2 minutes, aborting...')
    controller.abort()
  }, 120000) // 2 minutes (reduced from 2.5 to fail faster)

  try {
    const apiKey = getDeepSeekApiKey()
    const requestBody = {
      model: 'deepseek-chat',
      messages,
      temperature,
      max_tokens: 4000, // Further reduced to speed up response and reduce costs
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

    // Race between fetch and timeout - use separate timeout to ensure it fires
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeout = setTimeout(() => {
        controller.abort()
        reject(new Error('DeepSeek API timeout: Request took longer than 2 minutes'))
      }, 120000) // 2 minutes (reduced for faster failure detection)
      // Store timeout ID for cleanup if needed
      ;(timeoutPromise as any)._timeout = timeout
    })

    console.log('Waiting for DeepSeek API response...')
    let response: Response
    try {
      response = await Promise.race([fetchPromise, timeoutPromise])
      clearTimeout(timeoutId)
    } catch (raceError) {
      clearTimeout(timeoutId)
      if (raceError instanceof Error && (raceError.name === 'AbortError' || raceError.message.includes('timeout'))) {
        console.error('❌ DeepSeek API timeout or abort')
        throw new Error('DeepSeek API timeout: Request took longer than 2 minutes')
      }
      console.error('❌ DeepSeek API Promise.race error:', raceError)
      throw new Error(`DeepSeek API call failed: ${raceError instanceof Error ? raceError.message : String(raceError)}`)
    }
    
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
        console.error('DeepSeek API timeout after 2 minutes')
        throw new Error('DeepSeek API timeout: Request took longer than 2 minutes')
    }
    console.error('DeepSeek API error:', error)
    throw error
  }
}

/**
 * Recommend modules based on website analysis
 */
/**
 * Identify a competitor URL for a given website using LLM
 */
export async function identifyCompetitor(
  url: string,
  siteSummary: { title?: string; description?: string; content?: string }
): Promise<{ competitorUrl: string | null; reason: string }> {
  const contentSample = (siteSummary.content || '').substring(0, 1000) // Increased for better context
  const domain = new URL(url).hostname.replace('www.', '')
  
  const prompt = `You are an SEO analyst. Identify ONE direct competitor website for this business.

BUSINESS TO ANALYZE:
- URL: ${url}
- Domain: ${domain}
- Title: ${siteSummary.title || 'Not found'}
- Description: ${siteSummary.description || 'Not found'}
- Content sample: ${contentSample}

YOUR TASK:
Find a REAL, ACTIVE competitor website that:
1. Offers similar products/services in the same industry
2. Targets the same customer base
3. Is a direct business competitor (not a directory, marketplace, or aggregator)
4. Has a working website with actual business content

EXAMPLES:
- For a local restaurant: find another restaurant in the same area/cuisine
- For an author website: find another author in the same genre
- For a SaaS product: find another SaaS in the same category
- For a service business: find another service provider in the same industry

IMPORTANT:
- You MUST provide a real competitor URL if one exists
- Research the industry and find an actual competitor
- Return the full homepage URL (e.g., https://competitor.com)
- Do NOT return directories (Yelp, Google Business, Yellow Pages)
- Do NOT return social media (Facebook, Instagram, LinkedIn company pages)
- Do NOT return marketplaces (Amazon, Etsy, etc.)
- Do NOT return the same domain as the input

Respond with ONLY valid JSON (no markdown, no explanation, no code blocks):
{
  "competitorUrl": "https://actual-competitor-domain.com" or null,
  "reason": "Brief explanation of why this is a competitor or why none was found"
}`

  const messages: DeepSeekMessage[] = [
    {
      role: 'system',
      content: 'You are an SEO analyst who identifies direct business competitors. Always respond with valid JSON only.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ]

  try {
    console.log(`[identifyCompetitor] Identifying competitor for ${url}...`)
    
    // Add timeout protection (8 seconds to avoid Netlify timeout)
    const responsePromise = callDeepSeek(messages, 0.5)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Competitor identification timeout')), 8000)
    })
    
    const response = await Promise.race([responsePromise, timeoutPromise])
    
    // Extract JSON from response
    let jsonText = response.trim()
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '')
    }
    
    // Find JSON object
    let jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('[identifyCompetitor] No JSON found in response:', response.substring(0, 200))
      return { competitorUrl: null, reason: 'No competitor sites were identified for your industry, so this section gives general best practices instead.' }
    }
    
    let result
    try {
      result = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('[identifyCompetitor] JSON parse error:', parseError)
      console.error('[identifyCompetitor] Response text:', jsonMatch[0].substring(0, 500))
      return { competitorUrl: null, reason: 'No competitor sites were identified for your industry, so this section gives general best practices instead.' }
    }
    
    // Validate result
    if (result.competitorUrl && typeof result.competitorUrl === 'string') {
      // Ensure it's a valid URL and not the same as input
      try {
        const competitorUrlObj = new URL(result.competitorUrl)
        const inputUrlObj = new URL(url)
        
        // Don't return the same domain
        if (competitorUrlObj.hostname === inputUrlObj.hostname) {
          console.warn('[identifyCompetitor] LLM returned same URL as competitor, returning null')
          return { competitorUrl: null, reason: 'No competitor sites were identified for your industry, so this section gives general best practices instead.' }
        }
        
        console.log(`[identifyCompetitor] ✅ Found competitor: ${result.competitorUrl}`)
        return {
          competitorUrl: result.competitorUrl,
          reason: result.reason || 'Identified as a direct competitor',
        }
      } catch (urlError) {
        console.warn('[identifyCompetitor] Invalid competitor URL format:', result.competitorUrl)
        return { competitorUrl: null, reason: 'No competitor sites were identified for your industry, so this section gives general best practices instead.' }
      }
    }
    
    console.log('[identifyCompetitor] No competitor URL in response')
    return { competitorUrl: null, reason: result.reason || 'No competitor sites were identified for your industry, so this section gives general best practices instead.' }
  } catch (error) {
    console.error('[identifyCompetitor] Error identifying competitor:', error)
    return { competitorUrl: null, reason: 'No competitor sites were identified for your industry, so this section gives general best practices instead.' }
  }
}

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
  // Store full content for post-processing override
  const fullContent = (siteSummary.content || '').toLowerCase()
  const fullTitle = (siteSummary.title || '').toLowerCase()
  const fullDescription = (siteSummary.description || '').toLowerCase()
  const allText = `${fullTitle} ${fullDescription} ${fullContent}`
  
  // Optimized prompt - shorter and more focused for faster response
  const contentSample = (siteSummary.content || '').substring(0, 1000) // Increased to 1000 for better detection
  const prompt = `Analyze this website and recommend optional SEO checks.

URL: ${url}
Title: ${siteSummary.title || 'Not found'}
Description: ${siteSummary.description || 'Not found'}
Content: ${contentSample}

For each module, set true if recommended, false if not needed, and provide a one-sentence reason:

1. local - Set TRUE if this business has:
   - A physical address (street address, city, state, zip code)
   - A phone number
   - Serves a local geographic area
   - Examples: restaurants, contractors, installation services, local stores, service businesses
   - Set FALSE ONLY for: pure online services, SaaS platforms, digital agencies, remote-only consulting, websites with no physical location

2. accessibility - Should accessibility be checked? (Usually yes for all sites)

3. security - Should security be verified? (Usually yes for all sites)

4. schema - Would structured data help? (Usually yes for businesses - helps search engines understand business info)

5. social - Would social sharing optimization help? (If content is shareable, has blog/articles, or is a business website)

6. competitor_overview - Would competitor analysis help? (For businesses in competitive markets - most businesses benefit from this)

CRITICAL for local: 
- Look for physical addresses (e.g., "1030 N Crooks Rd, Suite G, Clawson, MI 48017" or any street address with city/state/zip)
- Look for phone numbers (e.g., "+1 248-288-6600" or any phone format)
- Look for business entity names (Industries, Inc., LLC, Corp, Company)
- Installation services, contractors, service businesses, and any business with a physical address should be TRUE
- Only set FALSE if the site explicitly says "online-only", "remote only", "no physical location", or is clearly a SaaS/digital platform with no local presence

Respond with ONLY valid JSON:
{
  "local": true/false,
  "accessibility": true/false,
  "security": true/false,
  "schema": true/false,
  "social": true/false,
  "competitor_overview": true/false,
  "reasons": {
    "local": "One sentence explanation - if false, explain why it's not a local business",
    "accessibility": "One sentence explanation",
    "security": "One sentence explanation",
    "schema": "One sentence explanation",
    "social": "One sentence explanation",
    "competitor_overview": "One sentence explanation"
  }
}`

  const messages: DeepSeekMessage[] = [
    {
      role: 'system',
      content: 'You are an SEO expert. Analyze websites and recommend optional SEO checks. Always respond with valid JSON only, no markdown.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ]

  console.log(`[recommendModules] Calling DeepSeek for ${url}`)
  const response = await callDeepSeek(messages, 0.3)
  console.log(`[recommendModules] DeepSeek response received: ${response.length} chars`)
  
  // Extract JSON from response (handle markdown code blocks and whitespace)
  let jsonText = response.trim()
  
  // Remove markdown code blocks if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '')
  }
  
  // Find JSON object
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('[recommendModules] No JSON found in response:', response.substring(0, 200))
    throw new Error('Invalid JSON response from DeepSeek')
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    
    // Validate structure
    const requiredKeys = ['local', 'accessibility', 'security', 'schema', 'social', 'competitor_overview', 'reasons']
    const missingKeys = requiredKeys.filter(key => !(key in parsed))
    if (missingKeys.length > 0) {
      console.error('[recommendModules] Missing keys in response:', missingKeys)
      throw new Error(`Invalid response structure: missing ${missingKeys.join(', ')}`)
    }
    
    // Post-process: Override local recommendation if we detect clear local business indicators
    // This catches cases where LLM misses obvious local businesses
    // Use the full content we stored earlier, not just the sample
    
    // More flexible address pattern - handles formats like:
    // "1030 N Crooks Rd, Suite G, Clawson, MI 48017"
    // "123 Main St, City, State 12345"
    // Also matches just "address", "location", etc.
    const hasAddress = /(\d+\s+[A-Za-z0-9\s#]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|circle|ct|place|pl|court|ct)(?:[,\s]+(?:suite|ste|unit|apt|apartment|#)[\sA-Za-z0-9]+)?[,\s]*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5})|(\d+\s+[A-Za-z0-9\s#]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|circle|ct|place|pl|court|ct)(?:[,\s]+(?:suite|ste|unit|apt|apartment|#)[\sA-Za-z0-9]+)?[,\s]*[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5})|(address|location|visit us|come in|our location|find us|physical location)/i.test(allText)
    
    // Phone pattern - handles +1 248-288-6600, (248) 288-6600, 248-288-6600, etc.
    const hasPhone = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|phone|call us|contact us|tel:|telephone/i.test(allText)
    
    // Business entity - check for Inc, LLC, Corp, Industries, Company
    const hasBusinessEntity = /(inc\.|llc|corp|industries|company|corporation)/i.test(allText)
    
    // More aggressive: If we have address AND phone, definitely local
    // OR if we have address/phone with business entity (Industries, Inc, LLC, etc.)
    // OR if we have business entity with any contact info
    // OR if we have business entity with any digits (likely address/phone even if pattern doesn't match)
    const hasBothAddressAndPhone = hasAddress && hasPhone
    const hasAddressOrPhoneWithEntity = (hasAddress || hasPhone) && hasBusinessEntity
    const hasEntityWithContact = hasBusinessEntity && (hasAddress || hasPhone)
    
    // Fallback: If we see "Industries" or business entity with digits, it's likely a local business
    // This catches cases where address format is non-standard
    const hasEntityWithDigits = hasBusinessEntity && /\d{3,}/.test(allText) // 3+ consecutive digits (phone or zip)
    
    // Ultra-aggressive: If title/URL has business entity (Industries, Inc, etc.) and any contact keywords, assume local
    const titleHasEntity = /(industries|inc\.|llc|corp|company)/i.test(siteSummary.title || '')
    const urlHasEntity = /(industries|inc|llc|corp|company)/i.test(url)
    const hasContactKeywords = /(contact|phone|address|location|call|email|tel)/i.test(allText)
    const hasEntityInTitleOrUrl = (titleHasEntity || urlHasEntity) && hasContactKeywords
    
    if (hasBothAddressAndPhone || hasAddressOrPhoneWithEntity || hasEntityWithContact || hasEntityWithDigits || hasEntityInTitleOrUrl) {
      console.log(`[recommendModules] Overriding local recommendation to true - detected local business indicators:`, {
        hasAddress,
        hasPhone,
        hasBusinessEntity,
        hasBothAddressAndPhone,
        hasAddressOrPhoneWithEntity,
        hasEntityWithContact,
        hasEntityWithDigits,
        hasEntityInTitleOrUrl,
        titleHasEntity,
        urlHasEntity,
        hasContactKeywords,
        url,
        title: siteSummary.title,
      })
      parsed.local = true
      parsed.reasons.local = 'Your site has a physical address and phone number, indicating a local business that would benefit from local SEO optimization.'
    } else {
      console.log(`[recommendModules] Not overriding local - no clear indicators found:`, {
        hasAddress,
        hasPhone,
        hasBusinessEntity,
        contentLength: allText.length,
        contentSample: allText.substring(0, 500),
      })
    }
    
    console.log(`[recommendModules] Successfully parsed recommendations`)
    return parsed
  } catch (parseError) {
    console.error('[recommendModules] JSON parse error:', parseError)
    console.error('[recommendModules] Response text:', jsonMatch[0].substring(0, 500))
    throw new Error(`Failed to parse recommendations: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
  }
}

/**
 * Rewrite audit results into a beginner-friendly report
 */
export async function generateReport(auditResult: {
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

  // Aggressively optimize prompt size - limit issues and truncate text
  // Further reduce to prevent timeouts
  const optimizedModules = auditResult.modules.map(m => ({
    key: m.moduleKey,
    score: m.score,
    // Only include essential evidence, limit size
    evidence: m.evidence ? Object.fromEntries(
      Object.entries(m.evidence).slice(0, 3).map(([k, v]) => [
        k, 
        typeof v === 'string' ? v.substring(0, 100) : v
      ])
    ) : {},
    // Limit to first 3 issues per module to reduce prompt size
    issues: (m.issues || []).slice(0, 3).map(i => ({
      title: (i.title || 'Issue').substring(0, 80), // Further limit title length
      severity: i.severity || 'low',
      // Truncate to 100 chars to keep prompt smaller
      why: (i.plainLanguageExplanation || '').substring(0, 100),
      how: (i.suggestedFix || '').substring(0, 100),
      // Limit evidence size
      evidence: i.evidence ? Object.fromEntries(
        Object.entries(i.evidence).slice(0, 2).map(([k, v]) => [
          k,
          typeof v === 'string' ? v.substring(0, 50) : (Array.isArray(v) ? v.slice(0, 2) : v)
        ])
      ) : {},
    })),
  }))
  
  console.log(`Optimized modules for prompt: ${optimizedModules.length} modules`)
  const totalIssues = optimizedModules.reduce((sum, m) => sum + m.issues.length, 0)
  console.log(`Total issues in prompt: ${totalIssues} (max 5 per module)`)
  
  // Calculate prompt size before creating full prompt
  const moduleDataSize = JSON.stringify(optimizedModules).length
  console.log(`Module data size: ${moduleDataSize} characters (${(moduleDataSize / 1024).toFixed(1)} KB)`)

  const pageInfo = auditResult.pageAnalysis ? `
Page Analysis:
- URL: ${auditResult.pageAnalysis.url}
- Final URL: ${auditResult.pageAnalysis.finalUrl || auditResult.pageAnalysis.url}
- HTTP Status: ${auditResult.pageAnalysis.httpStatus || 200}
- Content Type: ${auditResult.pageAnalysis.contentType || 'unknown'}
- Page Size: ${auditResult.pageAnalysis.pageSize || 'unknown'}
- Has Redirect: ${auditResult.pageAnalysis.hasRedirect ? 'Yes' : 'No'}
- Uses HTTPS: ${auditResult.pageAnalysis.isHttps ? 'Yes' : 'No'}
- Title: ${auditResult.pageAnalysis.title || 'Not found'}
- Meta Description: ${auditResult.pageAnalysis.metaDescription || 'Not found'}
- H1 Heading: ${auditResult.pageAnalysis.h1Text || 'Not found'}
- Word Count: ${auditResult.pageAnalysis.wordCount || 0}
- Images: ${auditResult.pageAnalysis.totalImages || 0} total, ${auditResult.pageAnalysis.missingAltText || 0} missing alt text
- Links: ${auditResult.pageAnalysis.internalLinks || 0} internal, ${auditResult.pageAnalysis.externalLinks || 0} external
` : ''

  const prompt = `You write ultra-simple, beginner-friendly website reports for small business owners who have 1-10 page websites. They want quick fixes, not technical education.

Website URL: ${auditResult.url}
${pageInfo}
Audit Results (${optimizedModules.length} modules checked):
${JSON.stringify(optimizedModules, null, 1)}

REQUIREMENTS:
- Keep it SHORT (2-3 pages max)
- Use plain English, no jargon
- One-sentence fixes only
- Structure: Executive Summary → Quick Fix Checklist → Top Actions → Modules
- Quick Fix Checklist: 5-7 simple items
- Module names: "Page Speed", "Search Engine Access", "Page Content", "Mobile Friendly", etc.
- For each issue: Title, Why (one sentence), How to fix (one sentence), Evidence
- Tone: Friendly, like helping a friend

Respond with ONLY valid JSON in this exact format:
{
  "pageInfo": {
    "url": "The audited URL",
    "title": "Actual page title found",
    "metaDescription": "Actual description found",
    "h1Text": "Actual H1 heading text",
    "wordCount": 500,
    "totalImages": 10,
    "missingAltText": 3,
    "internalLinks": 8,
    "externalLinks": 5,
    "isHttps": true
  },
  "executiveSummary": ["bullet point 1", "bullet point 2", "bullet point 3"],
  "quickFixChecklist": [
    "Add a page description",
    "Fix robots.txt blocking",
    "Add alt text to images"
  ],
  "topActions": [
    {
      "title": "Fix title",
      "why": "Why this matters in one sentence",
      "how": "How to fix it in ONE SENTENCE - be specific"
    }
  ],
  "modules": [
    {
      "moduleName": "Page Speed",
      "overview": "One sentence about what this category checks",
      "evidence": {
        "title": "Actual page title found",
        "metaDescription": "Actual meta description found",
        "h1Text": "Actual H1 heading text",
        "etc": "Other relevant evidence"
      },
      "issues": [
        {
          "title": "Issue title from results",
          "severity": "high",
          "why": "Why this matters",
          "how": "How to fix it",
          "evidence": {
            "found": "Actual value found (e.g., actual title text, robots.txt content)",
            "expected": "What should be there",
            "actual": "What was actually found"
          }
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

  const promptSize = JSON.stringify(messages).length
  console.log(`Calling DeepSeek with ${auditResult.modules.length} modules...`)
  console.log(`Prompt size: ${promptSize} characters (${(promptSize / 1024).toFixed(1)} KB)`)
  
  let response: string
  try {
    response = await callDeepSeek(messages, 0.5)
    console.log(`✅ DeepSeek response received, length: ${response.length} characters`)
  } catch (llmError) {
    console.error('❌ DeepSeek API call failed:', llmError)
    console.error('Error details:', llmError instanceof Error ? llmError.message : String(llmError))
    throw new Error(`Failed to generate report: ${llmError instanceof Error ? llmError.message : String(llmError)}`)
  }
  
  if (!response || response.length === 0) {
    console.error('❌ Empty response from DeepSeek')
    throw new Error('DeepSeek returned empty response')
  }
  
  // Extract JSON - try multiple patterns with better error handling
  console.log('Extracting JSON from response...')
  let jsonMatch = response.match(/\{[\s\S]*\}/)
  
  // If no match, try to find JSON in code blocks
  if (!jsonMatch) {
    const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
    if (codeBlockMatch) {
      jsonMatch = [codeBlockMatch[1], codeBlockMatch[1]]
      console.log('Found JSON in code block')
    }
  }
  
  // Try to find JSON after common prefixes
  if (!jsonMatch) {
    const prefixMatch = response.match(/(?:Here'?s?|Here is|The report|JSON):?\s*(\{[\s\S]*\})/i)
    if (prefixMatch) {
      jsonMatch = [prefixMatch[1], prefixMatch[1]]
      console.log('Found JSON after prefix')
    }
  }
  
  if (!jsonMatch) {
    console.error('❌ No JSON found in response')
    console.error('Response preview (first 1000 chars):', response.substring(0, 1000))
    console.error('Response length:', response.length)
    throw new Error('Invalid JSON response from DeepSeek - no JSON found in response')
  }

  console.log('Parsing JSON response...')
  let reportData: any
  try {
    // Clean up the JSON string - remove any trailing text or incomplete JSON
    let jsonString = jsonMatch[0]
    // Try to find the closing brace to ensure we have complete JSON
    const lastBrace = jsonString.lastIndexOf('}')
    if (lastBrace > 0) {
      jsonString = jsonString.substring(0, lastBrace + 1)
    }
    reportData = JSON.parse(jsonString)
    console.log('✅ JSON parsed successfully')
    
    // Validate required fields and initialize if missing
    if (!reportData) {
      throw new Error('Parsed JSON is null or undefined')
    }
    
    if (!reportData.modules || !Array.isArray(reportData.modules)) {
      console.warn('⚠️  Report data missing modules array, initializing...')
      reportData.modules = []
    }
    
    if (!reportData.executiveSummary || !Array.isArray(reportData.executiveSummary)) {
      console.warn('⚠️  Report data missing executiveSummary, initializing...')
      reportData.executiveSummary = []
    }
    
    if (!reportData.topActions || !Array.isArray(reportData.topActions)) {
      console.warn('⚠️  Report data missing topActions, initializing...')
      reportData.topActions = []
    }
    
    if (!reportData.quickFixChecklist || !Array.isArray(reportData.quickFixChecklist)) {
      console.warn('⚠️  Report data missing quickFixChecklist, initializing...')
      reportData.quickFixChecklist = []
    }
    
    // Ensure pageInfo is included if pageAnalysis exists
    if (auditResult.pageAnalysis && !reportData.pageInfo) {
      console.warn('⚠️  Report data missing pageInfo, adding from pageAnalysis...')
      reportData.pageInfo = {
        url: auditResult.pageAnalysis.url || auditResult.url,
        finalUrl: auditResult.pageAnalysis.finalUrl || auditResult.pageAnalysis.url || auditResult.url,
        title: auditResult.pageAnalysis.title || null,
        metaDescription: auditResult.pageAnalysis.metaDescription || null,
        h1Text: auditResult.pageAnalysis.h1Text || null,
        wordCount: auditResult.pageAnalysis.wordCount || 0,
        totalImages: auditResult.pageAnalysis.totalImages || 0,
        missingAltText: auditResult.pageAnalysis.missingAltText || 0,
        internalLinks: auditResult.pageAnalysis.internalLinks || 0,
        externalLinks: auditResult.pageAnalysis.externalLinks || 0,
        isHttps: auditResult.pageAnalysis.isHttps || false,
        hasRedirect: auditResult.pageAnalysis.hasRedirect || false,
      }
    }
    
  } catch (parseError) {
    console.error('❌ JSON parse error:', parseError)
    console.error('JSON string preview:', jsonMatch[0].substring(0, 500))
    throw new Error(`Failed to parse JSON from DeepSeek response: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
  }

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
          overview: (moduleResult.summary || `This section checks ${displayName.toLowerCase()}.`).replace(/</g, '&lt;').replace(/>/g, '&gt;'),
          issues: (moduleResult.issues && moduleResult.issues.length > 0)
            ? (moduleResult.issues || []).map(issue => ({
                title: (issue.title || 'Issue').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
                severity: issue.severity || 'low',
                why: (issue.plainLanguageExplanation || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
                how: (issue.suggestedFix || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
                evidence: issue.evidence || {},
              }))
            : [{
                title: 'All checks passed',
                severity: 'low',
                why: 'This category is in good shape.',
                how: 'No action needed for this category.',
              }],
          evidence: moduleResult.evidence || {},
        })
        console.log(`✅ Added missing module: ${displayName}`)
      } else {
        console.error(`❌ Module result not found for ${moduleKey}`)
      }
    }
  }
  
  // Final verification - check that all expected modules are present
  // (LLM may return duplicates or extra modules, which is fine)
  const finalModuleNames = new Set(
    (reportData.modules || []).map((m: any) => 
      (m.moduleName || '').toLowerCase().trim()
    )
  )
  const expectedModuleCount = auditModuleKeys.length
  const finalModuleCount = finalModuleNames.size
  
  // Check if all expected modules are present
  const missingModules: string[] = []
  for (const moduleKey of auditModuleKeys) {
    const displayName = moduleDisplayNames[moduleKey] || moduleKey
    const displayNameLower = displayName.toLowerCase().trim()
    if (!finalModuleNames.has(displayNameLower)) {
      missingModules.push(displayName)
    }
  }
  
  if (missingModules.length > 0) {
    console.error(`❌ Missing modules: ${missingModules.join(', ')}`)
    throw new Error(`Report is missing modules: ${missingModules.join(', ')}. Expected ${expectedModuleCount} modules.`)
  }
  
  console.log(`✅ All ${expectedModuleCount} expected modules verified in report (${finalModuleCount} total modules in report)`)

  // Generate HTML report
  const html = generateHTMLReport(reportData, auditResult.url)
  
  // Generate plaintext report
  const plaintext = generatePlaintextReport(reportData, auditResult.url)

  return { html, plaintext }
}

function generateHTMLReport(reportData: any, url: string): string {
  // Safely extract domain from URL
  let domain = url
  try {
    domain = new URL(url).hostname
  } catch (urlError) {
    console.warn('Invalid URL for HTML report, using URL as-is:', url, urlError)
    // Try to extract domain manually
    const match = url.match(/https?:\/\/([^\/]+)/)
    if (match) {
      domain = match[1]
    }
  }
  
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
    .evidence-table tr:last-child td {
      border-bottom: none;
    }
    .evidence-code {
      font-family: 'Monaco', 'Courier New', monospace;
      background: #f9fafb;
      padding: 8px;
      border-radius: 4px;
      font-size: 0.85em;
      word-break: break-all;
      max-width: 100%;
      overflow-x: auto;
    }
    .evidence-section {
      margin-top: 15px;
      padding: 15px;
      background: #f9fafb;
      border-radius: 4px;
      border-left: 3px solid #0ea5e9;
    }
    .evidence-section h4 {
      margin-top: 0;
      color: #0369a1;
      font-size: 1em;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
        padding: 20px;
      }
      a[href^="/"] {
        display: none;
      }
      .action, .issue {
        page-break-inside: avoid;
      }
      h1, h2 {
        page-break-after: avoid;
      }
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

    ${reportData.pageInfo ? `
  <h2>Page Breakdown</h2>
  <div class="evidence-section">
    <table class="evidence-table">
      <tr><th>Page URL</th><td>${(reportData.pageInfo.url || domain).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td></tr>
      ${reportData.pageInfo.finalUrl && reportData.pageInfo.finalUrl !== reportData.pageInfo.url ? `<tr><th>Final URL (after redirect)</th><td>${(reportData.pageInfo.finalUrl || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td></tr>` : ''}
      <tr><th>Page Title</th><td>${(reportData.pageInfo.title || 'Not found').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td></tr>
      <tr><th>Page Description</th><td>${(reportData.pageInfo.metaDescription || 'Not found').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td></tr>
      <tr><th>Main Heading (H1)</th><td>${(reportData.pageInfo.h1Text || 'Not found').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td></tr>
      <tr><th>Word Count</th><td>${reportData.pageInfo.wordCount || 0} words</td></tr>
      <tr><th>Images</th><td>${reportData.pageInfo.totalImages || 0} total${reportData.pageInfo.missingAltText ? `, ${reportData.pageInfo.missingAltText} missing descriptions` : ''}</td></tr>
      <tr><th>Links</th><td>${reportData.pageInfo.internalLinks || 0} internal, ${reportData.pageInfo.externalLinks || 0} external</td></tr>
      <tr><th>HTTPS</th><td>${reportData.pageInfo.isHttps ? 'Yes ✓' : 'No ✗'}</td></tr>
      ${reportData.pageInfo.hasRedirect ? `<tr><th>Redirect</th><td>Yes (redirected from ${(reportData.pageInfo.url || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')} to ${(reportData.pageInfo.finalUrl || reportData.pageInfo.url || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')})</td></tr>` : ''}
    </table>
  </div>
    ` : ''}

  <h2>Executive Summary</h2>
  <div class="summary">
      ${reportData.executiveSummary && Array.isArray(reportData.executiveSummary) ? (reportData.executiveSummary || []).map((point: string) => `<p>${(point || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('') : '<p>Your website audit is complete. Review the sections below for detailed findings.</p>'}
  </div>

    ${reportData.quickFixChecklist && reportData.quickFixChecklist.length > 0 ? `
  <h2>Quick Fix Checklist</h2>
  <div class="summary" style="background: #f0fdf4; border-left-color: #10b981;">
    <ul style="list-style: none; padding-left: 0;">
      ${(reportData.quickFixChecklist || []).map((item: string) => `
        <li style="margin: 10px 0; padding-left: 30px; position: relative;">
          <span style="position: absolute; left: 0; color: #10b981; font-size: 1.2em;">☐</span>
          ${(item || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </li>
      `).join('')}
    </ul>
    <p style="margin-top: 15px; color: #6b7280; font-size: 14px;">Check off each item as you complete it!</p>
  </div>
    ` : ''}

  <h2>Start Here: Top Priority Actions</h2>
    ${reportData.topActions && reportData.topActions.length > 0 ? (reportData.topActions || []).map((action: any, idx: number) => `
    <div class="action ${(action?.severity || 'high')}">
      <h3>${idx + 1}. ${(action?.title || 'Action').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h3>
      <p><strong>Why this matters:</strong> ${(action?.why || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      <p><strong>How to fix it:</strong> ${(action?.how || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    </div>
    `).join('') : '<p>Review the detailed sections below for specific recommendations.</p>'}

    ${reportData.modules && reportData.modules.length > 0 ? reportData.modules.map((module: any) => `
      <div class="module-section">
    <h2>${(module?.moduleName || 'Module').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h2>
        <p style="margin-bottom: 15px;">${(module?.overview || `This section checks ${(module?.moduleName || 'module').toLowerCase()}.`).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        ${module.evidence && Object.keys(module.evidence).length > 0 ? `
          <div class="evidence-section">
            <h4>What We Found:</h4>
            <table class="evidence-table">
              ${Object.entries(module.evidence).filter(([k, v]) => v !== null && v !== undefined && v !== '').map(([key, value]) => {
                const safeKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/</g, '&lt;').replace(/>/g, '&gt;')
                let safeValue = ''
                if (typeof value === 'string' && value.length > 200) {
                  safeValue = `<div class="evidence-code">${value.substring(0, 200).replace(/</g, '&lt;').replace(/>/g, '&gt;')}...</div>`
                } else if (typeof value === 'object') {
                  safeValue = `<div class="evidence-code">${JSON.stringify(value, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
                } else {
                  safeValue = String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;')
                }
                return `
                <tr>
                  <th>${safeKey}</th>
                  <td>${safeValue}</td>
                </tr>
              `
              }).join('')}
            </table>
          </div>
        ` : ''}
        ${module.issues && Array.isArray(module.issues) && module.issues.length > 0 ? (module.issues || []).map((issue: any) => `
          <div class="issue ${(issue?.severity || 'low')}">
        <span class="severity ${(issue?.severity || 'low')}">${(issue?.severity || 'low').toUpperCase()}</span>
            <h3 style="margin-top: 10px;">${(issue?.title || 'Issue').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h3>
        <p><strong>Why this matters:</strong> ${(issue?.why || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        <p><strong>How to fix it:</strong> ${(issue?.how || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        ${issue.evidence && Object.keys(issue.evidence).length > 0 ? `
          <div class="evidence-section" style="margin-top: 15px;">
            <h4>Evidence:</h4>
            <table class="evidence-table">
              ${Object.entries(issue.evidence).filter(([k, v]) => v !== null && v !== undefined && v !== '').map(([key, value]) => {
                const safeKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/</g, '&lt;').replace(/>/g, '&gt;')
                let safeValue = ''
                if (typeof value === 'string' && value.length > 300) {
                  safeValue = `<div class="evidence-code">${value.substring(0, 300).replace(/</g, '&lt;').replace(/>/g, '&gt;')}...</div>`
                } else if (typeof value === 'object') {
                  safeValue = `<div class="evidence-code">${JSON.stringify(value, null, 2).substring(0, 500).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
                } else {
                  safeValue = String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;')
                }
                return `
                <tr>
                  <th>${safeKey}</th>
                  <td>${safeValue}</td>
                </tr>
              `
              }).join('')}
            </table>
          </div>
        ` : ''}
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
  // Safely extract domain from URL
  let domain = url
  try {
    domain = new URL(url).hostname
  } catch (urlError) {
    console.warn('Invalid URL for plaintext report, using URL as-is:', url, urlError)
    // Try to extract domain manually
    const match = url.match(/https?:\/\/([^\/]+)/)
    if (match) {
      domain = match[1]
    }
  }
  
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
  if (reportData.topActions && Array.isArray(reportData.topActions) && reportData.topActions.length > 0) {
    (reportData.topActions || []).forEach((action: any, idx: number) => {
      const title = action?.title || 'Action'
      const why = action?.why || ''
      const how = action?.how || ''
      text += `\n${idx + 1}. ${title}\n`
      text += `   Why this matters: ${why}\n`
      text += `   How to fix it: ${how}\n`
    })
  } else {
    text += `Review the detailed sections below for specific recommendations.\n`
  }
  
  if (reportData.modules && reportData.modules.length > 0) {
  reportData.modules.forEach((module: any) => {
    const moduleName = (module?.moduleName || 'Module').toUpperCase()
    const overview = module?.overview || `This section checks ${(module?.moduleName || 'module').toLowerCase()}.`
    text += `\n${moduleName}\n`
    text += `${'='.repeat(50)}\n`
    text += `${overview}\n\n`
    if (module.issues && Array.isArray(module.issues) && module.issues.length > 0) {
      (module.issues || []).forEach((issue: any) => {
        const severity = (issue?.severity || 'low').toUpperCase()
        const title = issue?.title || 'Issue'
        const why = issue?.why || ''
        const how = issue?.how || ''
        text += `[${severity}] ${title}\n`
        text += `Why this matters: ${why}\n`
        text += `How to fix it: ${how}\n\n`
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


