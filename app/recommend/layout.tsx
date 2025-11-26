import { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.netlify.app'

export const metadata: Metadata = {
  title: 'Select Audit Modules | SEO CheckSite',
  description: 'Choose which SEO modules to include in your website audit. Get recommendations based on your site\'s needs.',
  robots: {
    index: false, // Don't index this page (it's part of the checkout flow)
    follow: false,
  },
  alternates: {
    canonical: `${siteUrl}/recommend`,
  },
}

export default function RecommendLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

