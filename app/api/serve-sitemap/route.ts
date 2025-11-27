import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    // Get the base URL from the request (supports both netlify.app and custom domain)
    const host = request.headers.get('host') || 'seochecksite.netlify.app'
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = `${protocol}://${host}`
    
    // Read the sitemap.xml file from the project root
    const filePath = join(process.cwd(), 'sitemap.xml')
    let sitemapContent = readFileSync(filePath, 'utf-8')
    
    // Replace the hardcoded domain with the request's domain
    // This ensures the sitemap works for both netlify.app and custom domains
    sitemapContent = sitemapContent.replace(
      /https:\/\/seochecksite\.netlify\.app/g,
      baseUrl
    )
    
    return new NextResponse(sitemapContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error) {
    console.error('Error reading sitemap.xml:', error)
    return new NextResponse('Sitemap not found', { status: 404 })
  }
}

