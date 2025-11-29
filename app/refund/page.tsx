import { Metadata } from 'next'
import Link from 'next/link'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.netlify.app'

export const metadata: Metadata = {
  title: 'Refund Policy | SEO CheckSite',
  description: 'Refund Policy for SEO CheckSite. Learn about our refund process and eligibility requirements.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${siteUrl}/refund`,
  },
}

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center">
            ← Back to Home
          </Link>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Refund Policy</h1>
        <div className="bg-white rounded-lg shadow-lg p-8 prose prose-lg max-w-none">
          <p className="text-gray-600 mb-4">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Refund Eligibility</h2>
          <p className="text-gray-700 mb-4">
            We want you to be satisfied with your website audit. Refunds are available under the following circumstances:
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Automatic Refund Scenarios:</h3>
            <ul className="list-disc pl-6 text-gray-700">
              <li>The audit fails to complete due to technical errors on our part</li>
              <li>The report is not delivered via email within 24 hours of payment</li>
              <li>The website URL provided is inaccessible or invalid (and we cannot process the audit)</li>
            </ul>
          </div>

          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Request-Based Refunds:</h3>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Refund requests made within 7 days of purchase, if the report has not been accessed</li>
              <li>If you accidentally purchased multiple audits for the same website</li>
              <li>If you believe the report does not meet the service description (we'll review on a case-by-case basis)</li>
            </ul>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Non-Refundable Situations</h2>
          <p className="text-gray-700 mb-4">Refunds are generally not available for:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>Reports that have been successfully delivered and accessed</li>
            <li>Disagreement with audit findings or recommendations (reports are based on automated analysis)</li>
            <li>Changes to your website after the audit was completed</li>
            <li>Requests made more than 30 days after purchase</li>
            <li>If you provided incorrect website URLs or contact information</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">How to Request a Refund</h2>
          <p className="text-gray-700 mb-4">
            To request a refund, please contact us at <a href="mailto:contact@seochecksite.net" className="text-blue-600 hover:underline">contact@seochecksite.net</a> with:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>Your email address used for the purchase</li>
            <li>The audit ID or website URL that was audited</li>
            <li>The reason for your refund request</li>
            <li>The date of purchase</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Refund Processing</h2>
          <p className="text-gray-700 mb-4">
            Approved refunds will be processed within 5-10 business days. Refunds will be issued to the original payment method used for the purchase. If you paid by credit card, the refund will appear on your statement within 1-2 billing cycles depending on your bank.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Partial Refunds</h2>
          <p className="text-gray-700 mb-4">
            In some cases, we may offer partial refunds if:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>Only some modules failed to complete (we'll refund the cost of failed modules)</li>
            <li>The report was delivered but significantly delayed (we may offer a partial refund as a goodwill gesture)</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Dispute Resolution</h2>
          <p className="text-gray-700 mb-4">
            If you're not satisfied with our refund decision, please contact us to discuss your concerns. We're committed to fair resolution of all disputes.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Contact Us</h2>
          <p className="text-gray-700 mb-4">
            For refund requests or questions about this policy, please contact:
          </p>
          <p className="text-gray-700 mb-4">
            Email: <a href="mailto:contact@seochecksite.net" className="text-blue-600 hover:underline">contact@seochecksite.net</a>
          </p>
          <p className="text-gray-700 mb-4">
            We typically respond to refund requests within 24-48 hours.
          </p>
        </div>
      </div>
    </div>
  )
}

