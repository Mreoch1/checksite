import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-12">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
          <nav aria-label="Legal and policy links">
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/privacy" className="hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded">
                Privacy Policy
              </Link>
              <span className="text-gray-300" aria-hidden="true">|</span>
              <Link href="/terms" className="hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded">
                Terms of Service
              </Link>
              <span className="text-gray-300" aria-hidden="true">|</span>
              <Link href="/refund" className="hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded">
                Refund Policy
              </Link>
              <span className="text-gray-300" aria-hidden="true">|</span>
              <Link href="/accessibility" className="hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded">
                Accessibility
              </Link>
            </div>
          </nav>
          <div className="text-center md:text-right">
            <p>© {new Date().getFullYear()} SEO CheckSite. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

