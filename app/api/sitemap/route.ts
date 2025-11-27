import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    // Use the netlify.app domain (no custom domain)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.netlify.app'
    
    // Generate sitemap XML with dynamic domain
    const pages = [
      { url: baseUrl, priority: '1.0', changefreq: 'weekly' },
      { url: `${baseUrl}/privacy`, priority: '0.5', changefreq: 'monthly' },
      { url: `${baseUrl}/terms`, priority: '0.5', changefreq: 'monthly' },
      { url: `${baseUrl}/refund`, priority: '0.5', changefreq: 'monthly' },
      { url: `${baseUrl}/accessibility`, priority: '0.3', changefreq: 'monthly' },
      { url: `${baseUrl}/sample-report`, priority: '0.7', changefreq: 'monthly' },
      { url: `${baseUrl}/recommend`, priority: '0.8', changefreq: 'weekly' },
      { url: `${baseUrl}/success`, priority: '0.3', changefreq: 'monthly' },
    ]
    
    const lastmod = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`
    
    return new NextResponse(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return new NextResponse('Sitemap generation error', { status: 500 })
  }
}

