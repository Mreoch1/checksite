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
        
        siteSummary = {
          title: $('title').first().text().trim(),
          description: $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || '',
          content: $('body').text().substring(0, 1000).trim(),
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
      const isLocalBusiness = /restaurant|cafe|barber|salon|plumber|electrician|contractor|dentist|doctor|clinic|store|shop|location|address|phone|hours|menu|services|local/i.test(allText)
      const hasSocialContent = /blog|article|news|share|social|facebook|twitter|instagram/i.test(allText)
      const isBusiness = /business|company|services|products|about|contact/i.test(allText)
      
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

