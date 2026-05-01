export const dynamic = "force-static"

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://seochecksite.net"

  const content = `User-agent: *
Allow: /

# Disallow admin and API routes
Disallow: /api/
Disallow: /admin/

# Allow public pages
Allow: /
Allow: /privacy
Allow: /terms
Allow: /refund
Allow: /recommend
Allow: /success
Allow: /report/

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml
`

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  })
}
// build-1777603506
