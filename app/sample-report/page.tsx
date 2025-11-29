import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sample Report | SEO CheckSite',
  description: 'View a sample SEO audit report to see what you\'ll get. Complete website analysis with actionable insights in plain language.',
  openGraph: {
    title: 'Sample SEO Audit Report | SEO CheckSite',
    description: 'See what you\'ll get in your SEO audit report. Complete website analysis with actionable insights.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sample SEO Audit Report | SEO CheckSite',
    description: 'See what you\'ll get in your SEO audit report.',
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.netlify.app'}/sample-report`,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function SampleReportPage() {
  // Sample report HTML - updated with latest audit report
  const sampleReportHtml = `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO CheckSite - Website Report</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      max-width: 900px; 
      margin: 0 auto; 
      padding: 20px; 
      background: #f9fafb;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 { 
      color: #0369a1; 
      border-bottom: 3px solid #0ea5e9; 
      padding-bottom: 10px; 
      margin-top: 0;
    }
    h2 { 
      color: #0284c7; 
      margin-top: 40px; 
      margin-bottom: 15px;
      font-size: 1.5em;
    }
    h3 {
      color: #0369a1;
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 1.2em;
    }
    .summary { 
      background: #f0f9ff; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 20px 0; 
      border-left: 4px solid #0ea5e9;
    }
    .action { 
      background: #fff; 
      border-left: 4px solid #0ea5e9; 
      padding: 15px; 
      margin: 15px 0; 
      border-radius: 4px;
    }
    .action.high { border-left-color: #dc2626; }
    .action.medium { border-left-color: #f59e0b; }
    .action.low { border-left-color: #10b981; }
    .module-section {
      margin: 30px 0;
      padding: 20px;
      background: #f9fafb;
      border-radius: 6px;
    }
    .issue { 
      margin: 15px 0; 
      padding: 15px; 
      background: #fff; 
      border-radius: 6px; 
      border-left: 3px solid #e5e7eb;
    }
    .issue.high { border-left-color: #dc2626; }
    .issue.medium { border-left-color: #f59e0b; }
    .issue.low { border-left-color: #10b981; }
    .severity { 
      display: inline-block; 
      padding: 4px 12px; 
      border-radius: 4px; 
      font-size: 0.85em; 
      font-weight: 600; 
      margin-bottom: 10px; 
      text-transform: uppercase;
    }
    .severity.high { background: #fee2e2; color: #991b1b; }
    .severity.medium { background: #fef3c7; color: #92400e; }
    .severity.low { background: #d1fae5; color: #065f46; }
    .no-issues {
      color: #10b981;
      font-weight: 600;
      padding: 10px;
      background: #d1fae5;
      border-radius: 4px;
    }
    .meta-info {
      color: #6b7280;
      font-size: 0.95em;
      margin-bottom: 30px;
    }
    .evidence-table {
      margin: 15px 0;
      border-collapse: collapse;
      width: 100%;
      background: #fff;
      border-radius: 4px;
      overflow: hidden;
    }
    .evidence-table th {
      background: #f3f4f6;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      font-size: 0.9em;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    .evidence-table td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 0.9em;
    }
    .score-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 1.1em;
      margin: 10px 0;
    }
    .score-high { background: #d1fae5; color: #065f46; }
    .score-medium { background: #fef3c7; color: #92400e; }
    .score-low { background: #fee2e2; color: #991b1b; }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; padding: 20px; }
      a[href^="/"] { display: none; }
      .action, .issue { page-break-inside: avoid; }
      h1, h2 { page-break-after: avoid; }
    }
  </style>


  <div class="container">
    <h1>SEO CheckSite</h1>
    <div style="margin-bottom: 20px;">
      <a href="/" style="color: #0ea5e9; text-decoration: none; font-weight: 600;">← Back to Home</a>
    </div>
    
    <h1 style="margin-top: 20px;">Website Report</h1>
    <div class="meta-info">
      <p><strong>Website:</strong> seochecksite.netlify.app</p>
      <p><strong>Date:</strong> November 26, 2025</p>
      <p><strong>Overall Score:</strong> 
        <span class="score-badge score-high">
          98/100
        </span>
      </p>
    </div>

    
    <h2>Page Breakdown</h2>
    <div class="summary">
      <table class="evidence-table">
        <tbody><tr><th>Page URL</th><td>https://seochecksite.netlify.app</td></tr>
        <tr><th>Final URL (after redirect)</th><td>https://seochecksite.netlify.app/</td></tr>
        <tr><th>Page Title</th><td>SEO CheckSite - Website Audit for Small Business Owners</td></tr>
        <tr><th>Page Description</th><td>Get a simple, jargon-free website report. No technical knowledge required. Professional SEO audits for small business owners.</td></tr>
        <tr><th>Main Heading (H1)</th><td>Get Your Website Checked</td></tr>
        <tr><th>Word Count</th><td>579 words</td></tr>
        <tr><th>Images</th><td>1 total</td></tr>
        <tr><th>Links</th><td>5 internal, 0 external</td></tr>
        <tr><th>HTTPS</th><td>Yes ✓</td></tr>
        <tr><th>Redirect</th><td>Yes (redirected from https://seochecksite.netlify.app to https://seochecksite.netlify.app/)</td></tr>
      </tbody></table>
    </div>
    

    <h2>Executive Summary</h2>
    <div class="summary">
      <div style="margin-bottom: 15px;">
        <strong style="color: #0369a1; font-size: 1.1em;">Overall Score: 98/100</strong>
        <span class="score-badge score-high" style="margin-left: 10px;">
          GOOD
        </span>
      </div>
      <p style="margin: 8px 0;">Your website is in good overall health with strong SEO fundamentals.</p><p style="margin: 8px 0;">We checked 8 areas of your website.</p><p style="margin: 8px 0;">Found 3 issues total.</p><p style="margin: 8px 0;">1 medium-priority issue to address.</p><p style="margin: 8px 0;">8 of 8 checked areas are performing excellently.</p>
    </div>

    

    <h2>Start Here: Top Priority Actions</h2>
    
      <div class="action medium">
        <h3>1. Too many scripts may slow page loading</h3>
        <p><strong>Why this matters:</strong> Scripts can prevent your page from showing quickly to visitors.</p>
        <p><strong>How to fix it:</strong> Ask your web designer to optimize scripts or move them to load after the page content.</p>
      </div>
    
      <div class="action low">
        <h3>2. Consider adding lazy loading to images</h3>
        <p><strong>Why this matters:</strong> Adding lazy loading to images can help your pages load faster.</p>
        <p><strong>How to fix it:</strong> Ask your web designer to add loading="lazy" to your images. This makes images load only when visitors scroll to them.</p>
      </div>
    
      <div class="action low">
        <h3>3. Some optional security headers are missing</h3>
        <p><strong>Why this matters:</strong> These security headers provide additional protection but are optional. Your site is still secure.</p>
        <p><strong>How to fix it:</strong> Ask your web developer to add these security headers for enhanced protection.</p>
      </div>
    

    
      <div class="module-section">
        <h2>Performance</h2>
        <div style="margin-bottom: 15px;">
          <span class="score-badge score-high" style="margin-right: 10px;">GOOD</span>
          <span style="color: #6b7280; font-size: 0.9em;">Score: 85/100</span>
        </div>
        <p style="margin-bottom: 15px;">Your site performance looks good. We found one small improvement opportunity.</p>
        <p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This looks at your HTTPS status, images, scripts, and page resources.</p>
        
        
          <div style="margin: 20px 0; padding: 15px; background: #fff; border-radius: 4px; border: 1px solid #e5e7eb;">
            <h4 style="margin-top: 0; color: #374151;">What We Found:</h4>
            <table class="evidence-table">
              <tbody><tr><th style="width: 30%;">Is Https</th><td>true</td></tr><tr><th style="width: 30%;">Total Images</th><td>1</td></tr><tr><th style="width: 30%;">Images With Lazy Loading</th><td>0</td></tr><tr><th style="width: 30%;">Images Without Lazy Loading</th><td>1</td></tr><tr><th style="width: 30%;">Total Scripts</th><td>9</td></tr><tr><th style="width: 30%;">Blocking Scripts</th><td>9</td></tr><tr><th style="width: 30%;">Async Scripts</th><td>0</td></tr><tr><th style="width: 30%;">Deferred Scripts</th><td>0</td></tr><tr><th style="width: 30%;">Total Stylesheets</th><td>1</td></tr><tr><th style="width: 30%;">Total Resources</th><td>11</td></tr><tr><th style="width: 30%;">External Http Resources</th><td>0</td></tr>
            </tbody></table>
          </div>
        
        
        
            <div class="issue low">
              <span class="severity low">LOW</span>
              <h3 style="margin-top: 10px;">Consider adding lazy loading to images</h3>
              <p><strong>Why this matters:</strong> Adding lazy loading to images can help your pages load faster.</p>
              <p><strong>How to fix it:</strong> Ask your web designer to add loading="lazy" to your images. This makes images load only when visitors scroll to them.</p>
              
                <div style="margin-top: 15px; padding: 15px; background: #f9fafb; border-radius: 4px;">
                  <h4>Details:</h4>
                  <table class="evidence-table">
                    <tbody><tr><th>Found</th><td>1 images without lazy loading</td></tr><tr><th>Actual</th><td>0 with lazy loading, 1 without</td></tr><tr><th>Expected</th><td>All images should have loading="lazy" attribute</td></tr><tr><th>Count</th><td>1</td></tr>
                  </tbody></table>
                </div>
              
            </div>
          
            <div class="issue medium">
              <span class="severity medium">MEDIUM</span>
              <h3 style="margin-top: 10px;">Too many scripts may slow page loading</h3>
              <p><strong>Why this matters:</strong> Scripts can prevent your page from showing quickly to visitors.</p>
              <p><strong>How to fix it:</strong> Ask your web designer to optimize scripts or move them to load after the page content.</p>
              
                <div style="margin-top: 15px; padding: 15px; background: #f9fafb; border-radius: 4px;">
                  <h4>Details:</h4>
                  <table class="evidence-table">
                    <tbody><tr><th>Found</th><td>9 blocking scripts</td></tr><tr><th>Actual</th><td>9 blocking, 0 async, 0 deferred</td></tr><tr><th>Expected</th><td>Scripts should use async or defer attributes</td></tr><tr><th>Count</th><td>9</td></tr><tr><th>Details</th><td>{
  "blockingScripts": [
    "/_next/static/chunks/fd9d1056-9f91b5e418130764.js",
    "/_next/static/chunks/117-b06ad745578f0d64.js",
    "/_next/static/chunks/main-app-f1e2f05f66ca4fbd.js",
    "/_next/static/chunks/972-c297c90601cf06f0.js",
    "/_next/static/chunks/878-71bd0a18f631c783.js"
  ]
}</td></tr>
                  </tbody></table>
                </div>
              
            </div>
          
      </div>
    
      <div class="module-section">
        <h2>Crawl Health</h2>
        <div style="margin-bottom: 15px;">
          <span class="score-badge score-high" style="margin-right: 10px;">GOOD</span>
          <span style="color: #6b7280; font-size: 0.9em;">Score: 100/100</span>
        </div>
        <p style="margin-bottom: 15px;">Search engines should be able to find your pages easily. Make sure you have a sitemap.xml file.</p>
        <p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks robots.txt, sitemap, internal links, and broken links.</p>
        
        
          <div style="margin: 20px 0; padding: 15px; background: #fff; border-radius: 4px; border: 1px solid #e5e7eb;">
            <h4 style="margin-top: 0; color: #374151;">What We Found:</h4>
            <table class="evidence-table">
              <tbody><tr><th style="width: 30%;">Robots Txt Content</th><td>User-agent: *
Allow: /

# Disallow admin and API routes
Disallow: /api/
Disallow: /admin/

# Allow public pages
Allow: /
Allow: /privacy
Allow: /terms
Allow: /refund
Allow: /recommend
Allow: /success
Allow: /report/

# Sitemap
Sitemap: https://seochecksite.netlify.app/sitemap.xml

</td></tr><tr><th style="width: 30%;">Internal Links Count</th><td>5</td></tr><tr><th style="width: 30%;">Total Links Checked</th><td>5</td></tr><tr><th style="width: 30%;">Broken Links Count</th><td>0</td></tr><tr><th style="width: 30%;">Sitemap Exists</th><td>true</td></tr><tr><th style="width: 30%;">Sitemap Url</th><td>https://seochecksite.netlify.app/sitemap.xml</td></tr>
            </tbody></table>
          </div>
        
        
        <div class="no-issues">✓ All checks passed for this category. Your site looks good in this area!</div>
      </div>
    
      <div class="module-section">
        <h2>On-Page SEO</h2>
        <div style="margin-bottom: 15px;">
          <span class="score-badge score-high" style="margin-right: 10px;">GOOD</span>
          <span style="color: #6b7280; font-size: 0.9em;">Score: 100/100</span>
        </div>
        <p style="margin-bottom: 15px;">Your on-page SEO is in good shape. Keep titles and descriptions clear and descriptive.</p>
        <p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks your page title, description, headings, and content quality.</p>
        
        
          <div style="margin: 20px 0; padding: 15px; background: #fff; border-radius: 4px; border: 1px solid #e5e7eb;">
            <h4 style="margin-top: 0; color: #374151;">What We Found:</h4>
            <table class="evidence-table">
              <tbody><tr><th style="width: 30%;">Title</th><td>SEO CheckSite - Website Audit for Small Business Owners</td></tr><tr><th style="width: 30%;">Title Length</th><td>55</td></tr><tr><th style="width: 30%;">Meta Description</th><td>Get a simple, jargon-free website report. No technical knowledge required. Professional SEO audits for small business owners.</td></tr><tr><th style="width: 30%;">Meta Description Length</th><td>125</td></tr><tr><th style="width: 30%;">H1 Text</th><td>Get Your Website Checked</td></tr><tr><th style="width: 30%;">H1 Count</th><td>1</td></tr><tr><th style="width: 30%;">H2 Count</th><td>6</td></tr><tr><th style="width: 30%;">H3 Count</th><td>14</td></tr><tr><th style="width: 30%;">Word Count</th><td>579</td></tr><tr><th style="width: 30%;">Image Count</th><td>1</td></tr><tr><th style="width: 30%;">Missing Alt Count</th><td>0</td></tr>
            </tbody></table>
          </div>
        
        
        <div class="no-issues">✓ All checks passed for this category. Your site looks good in this area!</div>
      </div>
    
      <div class="module-section">
        <h2>Mobile Optimization</h2>
        <div style="margin-bottom: 15px;">
          <span class="score-badge score-high" style="margin-right: 10px;">GOOD</span>
          <span style="color: #6b7280; font-size: 0.9em;">Score: 100/100</span>
        </div>
        <p style="margin-bottom: 15px;">Your site is mobile-friendly. Keep up the good work!</p>
        <p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks how well your site works on phones and tablets.</p>
        
        
          <div style="margin: 20px 0; padding: 15px; background: #fff; border-radius: 4px; border: 1px solid #e5e7eb;">
            <h4 style="margin-top: 0; color: #374151;">What We Found:</h4>
            <table class="evidence-table">
              <tbody><tr><th style="width: 30%;">Viewport</th><td>width=device-width, initial-scale=1</td></tr><tr><th style="width: 30%;">Has Viewport</th><td>true</td></tr><tr><th style="width: 30%;">Viewport Optimal</th><td>true</td></tr><tr><th style="width: 30%;">Has Fixed Width</th><td>false</td></tr><tr><th style="width: 30%;">Small Text Elements</th><td>0</td></tr><tr><th style="width: 30%;">Total Buttons</th><td>13</td></tr><tr><th style="width: 30%;">Small Buttons</th><td>0</td></tr><tr><th style="width: 30%;">Touch Targets Optimal</th><td>true</td></tr>
            </tbody></table>
          </div>
        
        
        <div class="no-issues">✓ All checks passed for this category. Your site looks good in this area!</div>
      </div>
    
      <div class="module-section">
        <h2>Accessibility</h2>
        <div style="margin-bottom: 15px;">
          <span class="score-badge score-high" style="margin-right: 10px;">GOOD</span>
          <span style="color: #6b7280; font-size: 0.9em;">Score: 100/100</span>
        </div>
        <p style="margin-bottom: 15px;">Your site is accessible. Good job making your site usable for everyone!</p>
        <p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks if your site is usable by everyone, including people with disabilities.</p>
        
        
          <div style="margin: 20px 0; padding: 15px; background: #fff; border-radius: 4px; border: 1px solid #e5e7eb;">
            <h4 style="margin-top: 0; color: #374151;">What We Found:</h4>
            <table class="evidence-table">
              <tbody><tr><th style="width: 30%;">Total Images</th><td>1</td></tr><tr><th style="width: 30%;">Images With Alt</th><td>1</td></tr><tr><th style="width: 30%;">Images Missing Alt</th><td>0</td></tr><tr><th style="width: 30%;">Total Form Fields</th><td>3</td></tr><tr><th style="width: 30%;">Form Fields With Labels</th><td>3</td></tr><tr><th style="width: 30%;">Form Fields Missing Labels</th><td>0</td></tr><tr><th style="width: 30%;">Heading Structure</th><td>H1: 1, H2: 6, H3: 14</td></tr><tr><th style="width: 30%;">Heading Hierarchy Issues</th><td>0</td></tr><tr><th style="width: 30%;">Low Contrast Elements</th><td>0</td></tr>
            </tbody></table>
          </div>
        
        
        <div class="no-issues">✓ All checks passed for this category. Your site looks good in this area!</div>
      </div>
    
      <div class="module-section">
        <h2>Security</h2>
        <div style="margin-bottom: 15px;">
          <span class="score-badge score-high" style="margin-right: 10px;">GOOD</span>
          <span style="color: #6b7280; font-size: 0.9em;">Score: 95/100</span>
        </div>
        <p style="margin-bottom: 15px;">Good, but some optional security enhancements are recommended.</p>
        <p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks HTTPS, security headers, and mixed content issues.</p>
        
        
          <div style="margin: 20px 0; padding: 15px; background: #fff; border-radius: 4px; border: 1px solid #e5e7eb;">
            <h4 style="margin-top: 0; color: #374151;">What We Found:</h4>
            <table class="evidence-table">
              <tbody><tr><th style="width: 30%;">Https Enabled</th><td>true</td></tr><tr><th style="width: 30%;">Has Mixed Content</th><td>false</td></tr><tr><th style="width: 30%;">Security Headers Found</th><td>strict-transport-security, x-frame-options, x-content-type-options, x-xss-protection</td></tr><tr><th style="width: 30%;">Security Headers Missing</th><td>content-security-policy</td></tr><tr><th style="width: 30%;">Total Security Headers</th><td>4</td></tr><tr><th style="width: 30%;">Total Missing Headers</th><td>1</td></tr>
            </tbody></table>
          </div>
        
        
        
            <div class="issue low">
              <span class="severity low">LOW</span>
              <h3 style="margin-top: 10px;">Some optional security headers are missing</h3>
              <p><strong>Why this matters:</strong> These security headers provide additional protection but are optional. Your site is still secure.</p>
              <p><strong>How to fix it:</strong> Ask your web developer to add these security headers for enhanced protection.</p>
              
                <div style="margin-top: 15px; padding: 15px; background: #f9fafb; border-radius: 4px;">
                  <h4>Details:</h4>
                  <table class="evidence-table">
                    <tbody><tr><th>Found</th><td>strict-transport-security, x-frame-options, x-content-type-options, x-xss-protection</td></tr><tr><th>Actual</th><td>Found: 4, Missing: 1</td></tr><tr><th>Expected</th><td>All recommended security headers present</td></tr><tr><th>Details</th><td>{
  "foundHeaders": [
    "strict-transport-security",
    "x-frame-options",
    "x-content-type-options",
    "x-xss-protection"
  ],
  "missingHeaders": [
    "content-security-policy"
  ]
}</td></tr>
                  </tbody></table>
                </div>
              
            </div>
          
      </div>
    
      <div class="module-section">
        <h2>Schema Markup</h2>
        <div style="margin-bottom: 15px;">
          <span class="score-badge score-high" style="margin-right: 10px;">GOOD</span>
          <span style="color: #6b7280; font-size: 0.9em;">Score: 100/100</span>
        </div>
        <p style="margin-bottom: 15px;">Your structured data is well implemented. This helps search engines understand your business.</p>
        <p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks for structured data that helps search engines understand your content.</p>
        
        
          <div style="margin: 20px 0; padding: 15px; background: #fff; border-radius: 4px; border: 1px solid #e5e7eb;">
            <h4 style="margin-top: 0; color: #374151;">What We Found:</h4>
            <table class="evidence-table">
              <tbody><tr><th style="width: 30%;">Schema Found</th><td>true</td></tr><tr><th style="width: 30%;">Schema Count</th><td>1</td></tr><tr><th style="width: 30%;">Schema Types</th><td>Organization</td></tr><tr><th style="width: 30%;">Schema Preview</th><td><pre style="white-space: pre-wrap; font-size: 0.85em; background: #f9fafb; padding: 12px; border-radius: 4px; border: 1px solid #e5e7eb; overflow-x: auto; max-width: 100%; margin: 0;">{"@context":"https://schema.org","@type":"Organization","name":"SEO CheckSite","url":"https://seochecksite.netlify.app","logo":"https://seochecksite.netlify.app/logo.svg","description":"Get a simple, ...</pre></td></tr>
            </tbody></table>
          </div>
        
        
        <div class="no-issues">✓ All checks passed for this category. Your site looks good in this area!</div>
      </div>
    
      <div class="module-section">
        <h2>Social Metadata</h2>
        <div style="margin-bottom: 15px;">
          <span class="score-badge score-high" style="margin-right: 10px;">GOOD</span>
          <span style="color: #6b7280; font-size: 0.9em;">Score: 100/100</span>
        </div>
        <p style="margin-bottom: 15px;">Your social sharing is well configured. Your links will look great when shared!</p>
        <p style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">This checks Open Graph and Twitter Card tags for social sharing.</p>
        
        
          <div style="margin: 20px 0; padding: 15px; background: #fff; border-radius: 4px; border: 1px solid #e5e7eb;">
            <h4 style="margin-top: 0; color: #374151;">What We Found:</h4>
            <table class="evidence-table">
              <tbody><tr><th style="width: 30%;">Og Title</th><td>SEO CheckSite - Website Audit for Small Business Owners</td></tr><tr><th style="width: 30%;">Og Description</th><td>Get a simple, jargon-free website report. No technical knowledge required. Professional SEO audits for small business owners.</td></tr><tr><th style="width: 30%;">Og Image</th><td>https://seochecksite.netlify.app/logo.svg</td></tr><tr><th style="width: 30%;">Og Type</th><td>website</td></tr><tr><th style="width: 30%;">Og Url</th><td>https://seochecksite.netlify.app</td></tr><tr><th style="width: 30%;">Twitter Card</th><td>summary_large_image</td></tr><tr><th style="width: 30%;">Twitter Title</th><td>SEO CheckSite - Website Audit for Small Business Owners</td></tr><tr><th style="width: 30%;">Twitter Description</th><td>Get a simple, jargon-free website report. No technical knowledge required. Professional SEO audits for small business owners.</td></tr><tr><th style="width: 30%;">Twitter Image</th><td>https://seochecksite.netlify.app/logo.svg</td></tr>
            </tbody></table>
          </div>
        
        
        <div class="no-issues">✓ All checks passed for this category. Your site looks good in this area!</div>
      </div>
    

    <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
    <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 4px;">
      <p style="color: #065f46; font-size: 1em; margin: 0; font-weight: 500; line-height: 1.6;">
        Overall, your site is in strong shape. Fixing the recommendations above will give you even better performance in search.
      </p>
    </div>
    <p style="color: #6b7280; font-size: 0.9em; text-align: center; margin-top: 30px;">
      This report was generated by SEO CheckSite. For questions, email us at admin@seochecksite.net. We're here to help!
    </p>
  </div>
`

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" aria-label="Go to homepage">
            <Image
              src="/logo.svg"
              alt="SEO CheckSite - Website Audit for Small Business Owners"
              width={240}
              height={72}
              priority
            />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            aria-label="Back to homepage"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-2">Sample Report</h2>
          <p className="text-blue-800">
            This is an example of what your audit report will look like. Your actual report will be customized based on your website's specific findings.
          </p>
        </div>
        
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: sampleReportHtml }}
        />
      </div>
    </div>
  )
}
