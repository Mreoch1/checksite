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

    // Get recommendations from DeepSeek with overall timeout (2.5 minutes total - reduced for faster failure)
    console.log(`[recommend-modules] Starting analysis for ${normalizedUrl}`)
    const recommendationsPromise = recommendModules(normalizedUrl, siteSummary)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Recommendation request timeout: Took longer than 2.5 minutes'))
      }, 150000) // 2.5 minutes total timeout (reduced from 3)
    })

    const recommendations = await Promise.race([recommendationsPromise, timeoutPromise])
    console.log(`[recommend-modules] Analysis complete for ${normalizedUrl}`)

    return NextResponse.json(recommendations)
  } catch (error) {
    console.error('[recommend-modules] Error:', error)
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500),
    } : { message: String(error) }
    console.error('[recommend-modules] Error details:', JSON.stringify(errorDetails, null, 2))
    
    // Provide more specific error messages
    let errorMessage = 'Failed to get recommendations'
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'The analysis took too long. Please try again or check if the website is accessible.'
        statusCode = 504 // Gateway Timeout
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        errorMessage = 'Unable to reach the website. Please check the URL and try again.'
        statusCode = 503 // Service Unavailable
      } else if (error.message.includes('DEEPSEEK_API_KEY') || error.message.includes('required')) {
        errorMessage = 'Analysis service configuration error. Please contact support.'
        statusCode = 503
      } else if (error.message.includes('DeepSeek') || error.message.includes('API')) {
        errorMessage = 'Analysis service temporarily unavailable. Please try again in a moment.'
        statusCode = 503
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: statusCode }
    )
  }
}

