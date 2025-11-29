import { Metadata } from 'next'
import Link from 'next/link'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.netlify.app'

export const metadata: Metadata = {
  title: 'Accessibility Statement | SEO CheckSite',
  description: 'Accessibility Statement for SEO CheckSite. Our commitment to digital accessibility and WCAG 2.1 Level AA compliance.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${siteUrl}/accessibility`,
  },
}

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center">
            ← Back to Home
          </Link>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Accessibility Statement</h1>
        <div className="bg-white rounded-lg shadow-lg p-8 prose prose-lg max-w-none">
          <p className="text-gray-600 mb-4">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Our Commitment</h2>
          <p className="text-gray-700 mb-4">
            SEO CheckSite is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards to achieve these goals.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Conformance Status</h2>
          <p className="text-gray-700 mb-4">
            The Web Content Accessibility Guidelines (WCAG) defines requirements for designers and developers to improve accessibility for people with disabilities. SEO CheckSite aims to conform to WCAG 2.1 Level AA standards.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Accessibility Features</h2>
          <p className="text-gray-700 mb-4">We have implemented the following accessibility features:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>Semantic HTML5 markup for better screen reader support</li>
            <li>Proper heading hierarchy (H1, H2, H3, etc.)</li>
            <li>Alt text for all images</li>
            <li>Keyboard navigation support throughout the site</li>
            <li>Focus indicators for interactive elements</li>
            <li>Form labels and ARIA attributes where needed</li>
            <li>Sufficient color contrast ratios</li>
            <li>Responsive design that works on all devices</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Known Issues</h2>
          <p className="text-gray-700 mb-4">
            We are aware that some parts of our website may not be fully accessible. We are working to address these issues and improve our accessibility. If you encounter any accessibility barriers, please contact us.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Feedback</h2>
          <p className="text-gray-700 mb-4">
            We welcome your feedback on the accessibility of SEO CheckSite. If you encounter accessibility barriers, please let us know:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>Email: <a href="mailto:admin@seochecksite.net" className="text-blue-600 hover:underline">admin@seochecksite.net</a></li>
            <li>Describe the issue and the page where you encountered it</li>
            <li>Include your device and browser information if relevant</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Third-Party Content</h2>
          <p className="text-gray-700 mb-4">
            Some content on our website may be provided by third parties (such as Stripe for payment processing). We cannot guarantee the accessibility of third-party content, but we work with providers who prioritize accessibility.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Ongoing Efforts</h2>
          <p className="text-gray-700 mb-4">
            We regularly review our website for accessibility issues and make improvements. Our goal is to ensure that SEO CheckSite is accessible to all users, regardless of their abilities or the technology they use.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Contact Us</h2>
          <p className="text-gray-700 mb-4">
            If you have questions or concerns about accessibility, please contact us at:
          </p>
          <p className="text-gray-700 mb-4">
            Email: <a href="mailto:admin@seochecksite.net" className="text-blue-600 hover:underline">admin@seochecksite.net</a>
          </p>
        </div>
      </div>
    </div>
  )
}

