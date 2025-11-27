import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    // Read the sitemap.xml file from the project root
    const filePath = join(process.cwd(), 'sitemap.xml')
    const sitemapContent = readFileSync(filePath, 'utf-8')
    
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

