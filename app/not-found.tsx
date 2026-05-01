import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'Page Not Found | SEO CheckSite',
  robots: { index: false },
}

export default function NotFound() {
  return (
    <div className="min-h-[80vh] bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <Link href="/" className="inline-block mb-8">
          <Image
            src="/logo.svg"
            alt="SEO CheckSite"
            width={240}
            height={72}
            priority
            className="mx-auto"
          />
        </Link>

        <h1 className="text-6xl font-bold text-blue-600 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          This page could not be found
        </h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          The page you're looking for doesn't exist or the link may be broken. 
          If you were trying to view an audit report, check your email for the correct link.
        </p>

        <div className="space-y-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>

          <a
            href="mailto:admin@seochecksite.net"
            className="inline-flex items-center justify-center w-full px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contact Support
          </a>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Get your website audited —{' '}
            <Link href="/" className="text-blue-600 hover:underline font-medium">
              Start a free audit
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
