import type { Metadata } from 'next'
import './globals.css'
import Footer from '@/components/Footer'
import SkipLink from '@/components/SkipLink'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.netlify.app'
const siteName = 'SEO CheckSite'
const siteDescription = 'Get a simple, jargon-free website report. No technical knowledge required. Professional SEO audits for small business owners.'

// Structured Data (JSON-LD) for Organization
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SEO CheckSite',
  url: siteUrl,
  logo: `${siteUrl}/logo.svg`,
  description: siteDescription,
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'contact@seoauditpro.net',
    contactType: 'Customer Service',
  },
  sameAs: [
    // Add social media links when available
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'SEO CheckSite - Website Audit for Small Business Owners',
    template: '%s | SEO CheckSite',
  },
  description: siteDescription,
  keywords: ['website audit', 'SEO audit', 'website analysis', 'SEO check', 'website report', 'small business SEO'],
  authors: [{ name: 'SEO CheckSite' }],
  creator: 'SEO CheckSite',
  publisher: 'SEO CheckSite',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/logo-icon.svg', type: 'image/svg+xml', sizes: 'any' },
    ],
    apple: [
      { url: '/logo-icon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName,
    title: 'SEO CheckSite - Website Audit for Small Business Owners',
    description: siteDescription,
    images: [
      {
        url: `${siteUrl}/logo.svg`,
        width: 1200,
        height: 630,
        alt: 'SEO CheckSite Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SEO CheckSite - Website Audit for Small Business Owners',
    description: siteDescription,
    images: [`${siteUrl}/logo.svg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add when you have Google Search Console verification
    // google: 'your-verification-code',
  },
  alternates: {
    canonical: siteUrl,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/logo-icon.svg" type="image/svg+xml" sizes="any" />
        <link rel="apple-touch-icon" href="/logo-icon.svg" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body>
        <SkipLink />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  )
}

