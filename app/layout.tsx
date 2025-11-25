import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SiteCheck - Website Audit for Small Business Owners',
  description: 'Get a simple, jargon-free website report. No technical knowledge required.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

