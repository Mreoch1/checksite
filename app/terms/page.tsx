import { Metadata } from 'next'
import Link from 'next/link'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.netlify.app'

export const metadata: Metadata = {
  title: 'Terms of Service | SEO CheckSite',
  description: 'Terms of Service for SEO CheckSite. Read our terms and conditions for using our website audit service.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${siteUrl}/terms`,
  },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center">
            ← Back to Home
          </Link>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        <div className="bg-white rounded-lg shadow-lg p-8 prose prose-lg max-w-none">
          <p className="text-gray-600 mb-4">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Agreement to Terms</h2>
          <p className="text-gray-700 mb-4">
            By accessing or using SEO CheckSite ("the Service"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the Service.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Description of Service</h2>
          <p className="text-gray-700 mb-4">
            SEO CheckSite provides automated website audit services, including performance analysis, SEO checks, mobile optimization reviews, and related technical assessments. Reports are generated using automated tools and AI-powered analysis.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Payment and Pricing</h2>
          <p className="text-gray-700 mb-4">
            Payment is required before audit processing begins. Prices are displayed in USD and include applicable taxes. All payments are processed securely through Stripe. You agree to provide accurate payment information.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Service Delivery</h2>
          <p className="text-gray-700 mb-4">
            Upon payment confirmation, we will process your website audit. Reports are typically delivered via email within 2-5 minutes, though processing may take longer for complex websites. You will receive a link to access your report online.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Refund Policy</h2>
          <p className="text-gray-700 mb-4">
            Please see our <a href="/refund" className="text-blue-600 hover:underline">Refund Policy</a> for details. Generally, refunds are available if:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>The audit fails to complete due to technical errors on our part</li>
            <li>The report is not delivered within 24 hours of payment</li>
            <li>You request a refund within 7 days of purchase and the report has not been accessed</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">User Responsibilities</h2>
          <p className="text-gray-700 mb-4">You agree to:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>Provide accurate website URLs and contact information</li>
            <li>Ensure you have permission to audit the website you submit</li>
            <li>Not use the Service for illegal or unauthorized purposes</li>
            <li>Not attempt to interfere with or disrupt the Service</li>
            <li>Not share or resell audit reports without permission</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Intellectual Property</h2>
          <p className="text-gray-700 mb-4">
            The audit reports generated are provided for your use. You retain ownership of your website content. We retain ownership of the report format, analysis methodology, and our proprietary technology.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Service Limitations</h2>
          <p className="text-gray-700 mb-4">
            Our Service provides automated analysis and recommendations. We do not guarantee:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>Specific improvements to search rankings or website performance</li>
            <li>Accuracy of all technical assessments (results are based on automated analysis)</li>
            <li>Compatibility with all website types or configurations</li>
            <li>Availability of the Service at all times (we may experience downtime)</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Prohibited Uses</h2>
          <p className="text-gray-700 mb-4">You may not:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>Use the Service to audit websites you do not own or have permission to audit</li>
            <li>Use automated tools to submit multiple audits in violation of rate limits</li>
            <li>Attempt to reverse engineer or extract our analysis algorithms</li>
            <li>Use the Service to harm, harass, or violate the rights of others</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Limitation of Liability</h2>
          <p className="text-gray-700 mb-4">
            To the maximum extent permitted by law, SEO CheckSite shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the Service.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Termination</h2>
          <p className="text-gray-700 mb-4">
            We reserve the right to terminate or suspend your access to the Service immediately, without prior notice, for any breach of these Terms of Service or for any other reason we deem necessary.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Changes to Terms</h2>
          <p className="text-gray-700 mb-4">
            We reserve the right to modify these terms at any time. We will notify users of material changes by posting the updated terms on this page. Your continued use of the Service after changes constitutes acceptance of the new terms.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Governing Law</h2>
          <p className="text-gray-700 mb-4">
            These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. For users in the European Union, these Terms shall be governed by the laws of the European Union.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Contact Information</h2>
          <p className="text-gray-700 mb-4">
            For questions about these Terms of Service, please contact us at:
          </p>
          <p className="text-gray-700 mb-4">
            Email: <a href="mailto:contact@seochecksite.net" className="text-blue-600 hover:underline">contact@seochecksite.net</a>
          </p>
        </div>
      </div>
    </div>
  )
}

