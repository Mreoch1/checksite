import Link from 'next/link'

const defaultLinks = [
  {
    href: '/resources/how-to-fix-broken-links',
    label: 'How to Fix Broken Links on Your Website',
  },
  {
    href: '/resources/best-seo-audit-tools-for-small-business',
    label: 'Best SEO Audit Tools for Small Businesses',
  },
  {
    href: '/resources/free-seo-audit-tools-compared',
    label: 'Free SEO Audit Tools Compared',
  },
  {
    href: '/resources/seo-audit-example-for-small-business',
    label: 'SEO Audit Example for a Small Business',
  },
  {
    href: '/resources/before-and-after-seo-audit-checklist',
    label: 'Before and After SEO Audit Checklist',
  },
  {
    href: '/resources/seo-checksite-vs-ahrefs',
    label: 'SEO CheckSite vs Ahrefs (2026)',
  },
  {
    href: '/resources/seo-checksite-vs-other-audit-tools',
    label: 'SEO CheckSite vs Other SEO Audit Tools',
  },
  {
    href: '/resources/seo-checksite-vs-seobility',
    label: 'SEO CheckSite vs Seobility',
  },
  {
    href: '/resources/seo-checksite-vs-seo-site-checkup',
    label: 'SEO CheckSite vs SEO Site Checkup',
  },
  {
    href: '/resources/seo-checksite-vs-semrush',
    label: 'SEO CheckSite vs Semrush',
  },
  {
    href: '/resources/seo-checksite-vs-moz-pro',
    label: 'SEO CheckSite vs Moz Pro (2026)',
  },
  {
    href: '/resources/seo-checksite-vs-screaming-frog',
    label: 'SEO CheckSite vs Screaming Frog (2026)',
  },
  {
    href: '/resources/seo-terms-for-small-business-owners',
    label: 'SEO Terms for Small Business Owners',
  },
]

type ResourceLinksBlockProps = {
  title?: string
  excludeHref?: string
}

export default function ResourceLinksBlock({ title = 'Related guides', excludeHref }: ResourceLinksBlockProps) {
  const links = defaultLinks.filter((link) => link.href !== excludeHref)

  return (
    <section className="mt-10 border border-gray-200 rounded-lg p-6 bg-gray-50">
      <h2 className="text-xl font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="text-blue-700 font-medium hover:text-blue-800">
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  )
}

