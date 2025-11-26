import { NextRequest, NextResponse } from 'next/server'
import { recommendModules } from '@/lib/llm'
import { rateLimit, getClientId } from '@/lib/rate-limit'

// Force dynamic rendering - this route cannot be statically analyzed
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const fetchCache = 'force-no-store'
export const revalidate = 0

export async function POST(request: NextRequest) {
  // Rate limiting: 20 requests per minute per IP
  const clientId = getClientId(request)
  const rateLimitResult = rateLimit(`recommend:${clientId}`, 20, 60000)
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { 
        error: 'Too many requests',
        message: 'Please wait a moment before trying again',
      },
      { status: 429 }
    )
  }
  
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL
    let normalizedUrl = url
    if (!url.startsWith('http')) {
      normalizedUrl = `https://${url}`
    }

    // Fetch basic site info with timeout
    let siteSummary = {
      title: '',
      description: '',
      content: '',
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout for site fetch

      const response = await fetch(normalizedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEO CheckSite/1.0)',
        },
        redirect: 'follow',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const html = await response.text()
        // Dynamically import cheerio to avoid build-time analysis
        const cheerio = await import('cheerio') as typeof import('cheerio')
        const $ = cheerio.load(html)
        
        // Extract full body text for better detection (addresses/phones often in footer)
        const fullBodyText = $('body').text()
        // Also check footer specifically for address/phone
        const footerText = $('footer').text() || ''
        const combinedText = fullBodyText + ' ' + footerText
        
        siteSummary = {
          title: $('title').first().text().trim(),
          description: $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || '',
          content: combinedText.substring(0, 2000).trim(), // Increased to 2000 to capture footer content
        }
      }
    } catch (error) {
      console.error('Error fetching site:', error)
      // Continue with empty summary
    }

    // Get recommendations from DeepSeek with a short timeout (8 seconds to avoid Netlify 10s limit)
    // If LLM times out, return smart defaults based on site content
    console.log(`[recommend-modules] Starting analysis for ${normalizedUrl}`)
    
    try {
      const recommendationsPromise = recommendModules(normalizedUrl, siteSummary)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Recommendation request timeout'))
        }, 8000) // 8 seconds - must complete before Netlify's 10s limit
      })

      const recommendations = await Promise.race([recommendationsPromise, timeoutPromise])
      console.log(`[recommend-modules] Analysis complete for ${normalizedUrl}`)
      return NextResponse.json(recommendations)
    } catch (timeoutError) {
      // If LLM times out or fails, return smart defaults based on site content
      const errorMsg = timeoutError instanceof Error ? timeoutError.message : String(timeoutError)
      console.warn(`[recommend-modules] LLM error for ${normalizedUrl}: ${errorMsg}, using smart defaults`)
      
      const titleLower = (siteSummary.title || '').toLowerCase()
      const descLower = (siteSummary.description || '').toLowerCase()
      const contentLower = (siteSummary.content || '').toLowerCase()
      const allText = `${titleLower} ${descLower} ${contentLower}`
      
      // Smart defaults based on content analysis
      // Local business detection - check for physical address, phone, and business indicators
      
      // Check for address patterns (more flexible - handles "1030 N Crooks Rd, Suite G, Clawson, MI 48017")
      const hasAddressPattern = /(\d+\s+[A-Za-z0-9\s#]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|circle|ct|place|pl|court|ct|suite|ste|unit|apt|apartment)[,\s]*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5})|(\d+\s+[A-Za-z0-9\s#]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|circle|ct|place|pl|court|ct|suite|ste|unit|apt|apartment)[,\s]*[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5})|(address|location|visit us|come in|our location|find us|physical location)/i.test(allText)
      
      // Check for phone number patterns (handles +1 248-288-6600 format)
      const hasPhonePattern = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|phone|call us|contact us|tel:|telephone/i.test(allText)
      
      // Check for local business keywords (expanded list including installation, industries, etc.)
      const hasLocalKeywords = /(restaurant|cafe|barber|salon|plumber|electrician|contractor|dentist|doctor|clinic|store|shop|gym|fitness|spa|auto repair|car wash|dry cleaner|bakery|pizza|delivery|takeout|menu|hours|installation|installer|service|services|industries|inc\.|llc|corp|company|business|local|area|region|city|town|neighborhood|community|low voltage|electrical|hvac|plumbing|construction|repair|maintenance)/i.test(allText)
      
      // Check for business entity indicators
      const hasBusinessEntity = /(inc\.|llc|corp|corporation|company|industries|industries inc|industries, inc)/i.test(allText)
      
      // Check for online-only indicators (more specific to avoid false positives)
      const hasOnlineOnlyIndicators = /(online-only|digital-only|software as a service|saas platform|web-based tool|cloud-based|api service|remote only|virtual only|no physical location|no storefront|purely online|exclusively online)/i.test(allText)
      
      // A site is local if it has:
      // 1. (address AND phone) OR (address OR phone with business entity/keywords)
      // 2. AND NOT online-only
      const hasBothAddressAndPhone = hasAddressPattern && hasPhonePattern
      const hasAddressOrPhone = hasAddressPattern || hasPhonePattern
      const hasBusinessIndicators = hasLocalKeywords || hasBusinessEntity
      
      const isLocalBusiness = (hasBothAddressAndPhone || (hasAddressOrPhone && hasBusinessIndicators)) && !hasOnlineOnlyIndicators
      
      // Debug logging to help diagnose issues
      console.log(`[recommend-modules] Local business detection for ${normalizedUrl}:`, {
        hasAddressPattern,
        hasPhonePattern,
        hasBothAddressAndPhone,
        hasAddressOrPhone,
        hasLocalKeywords,
        hasBusinessEntity,
        hasBusinessIndicators,
        hasOnlineOnlyIndicators,
        isLocalBusiness,
        contentSample: allText.substring(0, 200),
      })
      
      const hasSocialContent = /blog|article|news|share|social|facebook|twitter|instagram|linkedin/i.test(allText)
      // Business detection - check for business indicators (name, services, contact info, etc.)
      const isBusiness = /(business|company|services|products|about|contact|pricing|plans|inc\.|llc|corp|industries|industries inc)/i.test(allText) || hasAddressPattern || hasPhonePattern
      
      const defaultRecommendations = {
        local: isLocalBusiness,
        accessibility: true, // Always recommended
        security: true, // Always recommended
        schema: isBusiness, // Recommended for businesses
        social: hasSocialContent || isBusiness,
        competitor_overview: isBusiness,
        reasons: {
          local: isLocalBusiness 
            ? 'Your site appears to be a local business, so local SEO will help customers find you in local search results.'
            : 'Your site doesn\'t appear to need a local SEO audit because it\'s an online-only business without a physical location or local service area.',
          accessibility: 'Accessibility checks help ensure your site is usable by everyone, including people with disabilities, and can improve your SEO.',
          security: 'Security checks help protect your site and visitors, and search engines favor secure websites.',
          schema: isBusiness
            ? 'Structured data helps search engines understand your business information and can improve how your site appears in search results.'
            : 'Your site doesn\'t appear to need schema markup because it lacks clear business information that would benefit from structured data.',
          social: hasSocialContent || isBusiness
            ? 'Social media optimization helps your content look great when shared on social platforms, increasing visibility and engagement.'
            : 'Your site doesn\'t appear to need social metadata optimization because it lacks shareable content or social media presence.',
          competitor_overview: isBusiness
            ? 'Competitor analysis helps you understand your market position and identify opportunities to improve your SEO strategy.'
            : 'Your site doesn\'t appear to need competitor analysis because it\'s not clearly a business competing in a market.',
        },
      }
      
      return NextResponse.json(defaultRecommendations)
    }
  } catch (error) {
    // If we get here, it's an error in URL validation or site fetching
    // For LLM errors, we should have already returned smart defaults
    console.error('[recommend-modules] Outer catch error:', error)
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500),
    } : { message: String(error) }
    console.error('[recommend-modules] Error details:', JSON.stringify(errorDetails, null, 2))
    
    // If it's a URL/site fetch error, return smart defaults anyway
    // This ensures users always get recommendations
    const titleLower = ''
    const descLower = ''
    const contentLower = ''
    const allText = `${titleLower} ${descLower} ${contentLower}`
    
    // Default to false for local - most sites are online-only
    const isLocalBusiness = false
    const hasSocialContent = false
    const isBusiness = true // Default to business recommendations
    
    const defaultRecommendations = {
      local: isLocalBusiness,
      accessibility: true,
      security: true,
      schema: isBusiness,
      social: hasSocialContent || isBusiness,
      competitor_overview: isBusiness,
      reasons: {
        local: 'Your site doesn\'t appear to need a local SEO audit because it\'s an online-only business without a physical location or local service area.',
        accessibility: 'Accessibility checks help ensure your site is usable by everyone, including people with disabilities, and can improve your SEO.',
        security: 'Security checks help protect your site and visitors, and search engines favor secure websites.',
        schema: 'Structured data helps search engines understand your business information and can improve how your site appears in search results.',
        social: 'Social media optimization helps your content look great when shared on social platforms, increasing visibility and engagement.',
        competitor_overview: 'Competitor analysis helps you understand your market position and identify opportunities to improve your SEO strategy.',
      },
    }
    
    return NextResponse.json(defaultRecommendations)
  }
}

