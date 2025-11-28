import { NextRequest, NextResponse } from 'next/server'
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

    // Normalize URL - add https:// and lowercase domain
    const { normalizeUrl } = await import('@/lib/normalize-url')
    const normalizedUrl = normalizeUrl(url)

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
        // Check common footer/contact sections
        const contactSection = $('[class*="contact"], [id*="contact"], [class*="footer"], [id*="footer"]').text()
        const combinedText = fullBodyText + ' ' + footerText + ' ' + contactSection
        
        // Extract up to 3000 chars to ensure we get footer content
        const extractedContent = combinedText.substring(0, 3000).trim()
        
        console.log(`[recommend-modules] Content extraction for ${normalizedUrl}:`, {
          bodyLength: fullBodyText.length,
          footerLength: footerText.length,
          contactLength: contactSection.length,
          extractedLength: extractedContent.length,
          hasAddress: /(\d+\s+[A-Za-z0-9\s#]+(?:road|rd|street|st|avenue|ave|drive|dr|boulevard|blvd))|address|location/i.test(extractedContent),
          hasPhone: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|phone|call/i.test(extractedContent),
          hasIndustries: /industries/i.test(extractedContent),
          contentSample: extractedContent.substring(0, 200),
        })
        
        siteSummary = {
          title: $('title').first().text().trim(),
          description: $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || '',
          content: extractedContent,
        }
      }
    } catch (error) {
      console.error('Error fetching site:', error)
      // Continue with empty summary
    }

    // Return smart defaults based on site content (no LLM needed)
    console.log(`[recommend-modules] Analyzing site content for ${normalizedUrl}`)
    
    const titleLower = (siteSummary.title || '').toLowerCase()
    const descLower = (siteSummary.description || '').toLowerCase()
    const contentLower = (siteSummary.content || '').toLowerCase()
    const allText = `${titleLower} ${descLower} ${contentLower}`
    
    // Check for address patterns (more flexible - handles "1030 N Crooks Rd, Suite G, Clawson, MI 48017")
    const hasAddressPattern = /(\d+\s+[A-Za-z0-9\s#]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|circle|ct|place|pl|court|ct|suite|ste|unit|apt|apartment)[,\s]*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5})|(\d+\s+[A-Za-z0-9\s#]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|circle|ct|place|pl|court|ct|suite|ste|unit|apt|apartment)[,\s]*[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5})|(address|location|visit us|come in|our location|find us|physical location)/i.test(allText)
    
    // Check for phone number patterns (handles +1 248-288-6600 format)
    const hasPhonePattern = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|phone|call us|contact us|tel:|telephone/i.test(allText)
    
    // Business detection - check for business indicators (name, services, contact info, etc.)
    const isBusiness = /(business|company|services|products|about|contact|pricing|plans|inc\.|llc|corp|industries|industries inc)/i.test(allText) || hasAddressPattern || hasPhonePattern
    
    // New pricing model: Only local and competitor_overview are optional add-ons
    // All other modules (accessibility, security, schema, social) are included in base package
    const defaultRecommendations = {
      local: hasAddressPattern && hasPhonePattern,
      competitor_overview: isBusiness,
      reasons: {
        local: hasAddressPattern && hasPhonePattern
          ? 'We detected a physical address and phone number on your site. Local SEO can help improve your visibility in local search results and Google Maps.'
          : 'Local SEO helps businesses with physical locations or local service areas. If you have a physical address or serve a local area, consider adding this module.',
        competitor_overview: isBusiness
          ? 'Competitor analysis helps you understand your market position and identify opportunities to improve your SEO strategy.'
          : 'Competitor analysis is available for businesses that want to compare their SEO against competitors.',
      },
    }
    
    return NextResponse.json(defaultRecommendations)
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
    
    // New pricing model: Only local and competitor_overview are optional add-ons
    const defaultRecommendations = {
      local: false,
      competitor_overview: isBusiness,
      reasons: {
        local: 'Local SEO helps businesses with physical locations or local service areas. If you have a physical address or serve a local area, consider adding this module.',
        competitor_overview: 'Competitor analysis helps you understand your market position and identify opportunities to improve your SEO strategy.',
      },
    }
    
    return NextResponse.json(defaultRecommendations)
  }
}

