import { NextRequest, NextResponse } from 'next/server'
import { recommendModules } from '@/lib/llm'
import * as cheerio from 'cheerio'

// Force dynamic rendering - this route cannot be statically analyzed
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
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

    // Fetch basic site info
    let siteSummary = {
      title: '',
      description: '',
      content: '',
    }

    try {
      const response = await fetch(normalizedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SiteCheck/1.0)',
        },
        redirect: 'follow',
      })

      if (response.ok) {
        const html = await response.text()
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

    // Get recommendations from DeepSeek
    const recommendations = await recommendModules(normalizedUrl, siteSummary)

    return NextResponse.json(recommendations)
  } catch (error) {
    console.error('Error in recommend-modules:', error)
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    )
  }
}

