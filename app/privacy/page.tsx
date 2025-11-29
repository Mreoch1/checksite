import { Metadata } from 'next'
import Link from 'next/link'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.netlify.app'

export const metadata: Metadata = {
  title: 'Privacy Policy | SEO CheckSite',
  description: 'Privacy Policy for SEO CheckSite. Learn how we collect, use, and protect your personal information. GDPR and CCPA compliant.',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${siteUrl}/privacy`,
  },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center">
            ← Back to Home
          </Link>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        <div className="bg-white rounded-lg shadow-lg p-8 prose prose-lg max-w-none">
          <p className="text-gray-600 mb-4">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Introduction</h2>
          <p className="text-gray-700 mb-4">
            SEO CheckSite ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website audit service.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Information We Collect</h2>
          <p className="text-gray-700 mb-4">We collect the following information:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li><strong>Personal Information:</strong> Name, email address, and website URL that you provide when requesting an audit</li>
            <li><strong>Payment Information:</strong> Processed securely through Stripe. We do not store credit card details.</li>
            <li><strong>Usage Data:</strong> Information about how you interact with our service, including audit results and report access</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">How We Use Your Information</h2>
          <p className="text-gray-700 mb-4">We use the information we collect to:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>Generate and deliver website audit reports</li>
            <li>Process payments and manage your account</li>
            <li>Send you email notifications about your audit status</li>
            <li>Improve our services and customer support</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Data Storage and Security</h2>
          <p className="text-gray-700 mb-4">
            Your data is stored securely using Supabase (PostgreSQL database) with industry-standard encryption. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Third-Party Services</h2>
          <p className="text-gray-700 mb-4">We use the following third-party services:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li><strong>Stripe:</strong> Payment processing (see Stripe's privacy policy)</li>
            <li><strong>SendGrid:</strong> Email delivery (see SendGrid's privacy policy)</li>
            <li><strong>Supabase:</strong> Database hosting (see Supabase's privacy policy)</li>
            <li><strong>DeepSeek:</strong> AI-powered report generation (see DeepSeek's privacy policy)</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Your Rights (GDPR & CCPA)</h2>
          <p className="text-gray-700 mb-4">You have the following rights regarding your personal information:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li><strong>Right to Access:</strong> Request a copy of the personal data we hold about you</li>
            <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete data</li>
            <li><strong>Right to Erasure:</strong> Request deletion of your personal data ("Right to be Forgotten")</li>
            <li><strong>Right to Restrict Processing:</strong> Request limitation of how we process your data</li>
            <li><strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
            <li><strong>Right to Object:</strong> Object to processing of your personal data</li>
            <li><strong>Right to Opt-Out (CCPA):</strong> California residents can opt-out of the sale of personal information (we do not sell personal information)</li>
            <li><strong>Right to Non-Discrimination:</strong> Exercise your privacy rights without discrimination</li>
          </ul>
          <p className="text-gray-700 mb-4">
            To exercise these rights, please contact us at: <a href="mailto:contact@seochecksite.net" className="text-blue-600 hover:underline">contact@seochecksite.net</a>
          </p>
          <p className="text-gray-700 mb-4">
            We will respond to your request within 30 days. If you are in the EU and are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Cookies and Tracking</h2>
          <p className="text-gray-700 mb-4">
            We use session storage to maintain your audit preferences during your visit. We do not use tracking cookies or third-party analytics that collect personal information.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Data Retention</h2>
          <p className="text-gray-700 mb-4">
            We retain your personal information for as long as necessary to provide our services and comply with legal obligations. Specifically:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4">
            <li>Audit reports and associated data: Retained for 1 year for customer support purposes</li>
            <li>Customer account information: Retained while your account is active and for 2 years after last activity</li>
            <li>Payment records: Retained as required by law (typically 7 years for tax purposes)</li>
            <li>Email communications: Retained for 1 year unless you request deletion</li>
          </ul>
          <p className="text-gray-700 mb-4">
            You may request deletion of your data at any time, subject to legal retention requirements.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Children's Privacy</h2>
          <p className="text-gray-700 mb-4">
            Our service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Changes to This Policy</h2>
          <p className="text-gray-700 mb-4">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Contact Us</h2>
          <p className="text-gray-700 mb-4">
            If you have questions about this Privacy Policy, please contact us at:
          </p>
          <p className="text-gray-700 mb-4">
            Email: <a href="mailto:contact@seochecksite.net" className="text-blue-600 hover:underline">contact@seochecksite.net</a>
          </p>
        </div>
      </div>
    </div>
  )
}

