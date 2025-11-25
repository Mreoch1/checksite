/**
 * Audit module implementations
 * Each module performs checks and returns structured results
 */

import * as cheerio from 'cheerio'
import { ModuleKey, ModuleResult, AuditIssue } from '../types'

interface SiteData {
  url: string
  html: string
  $: cheerio.CheerioAPI
  title?: string
  description?: string
  headers: Record<string, string>
  httpStatus?: number
  finalUrl?: string
  contentType?: string
  contentLength?: number
  isHttps?: boolean
}

/**
 * Fetch and parse a website
 */
export async function fetchSite(url: string): Promise<SiteData> {
  try {
    // Add timeout to fetch (15 seconds - reduced for faster audits)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEO CheckSite/1.0)',
      },
      redirect: 'follow',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    const headers: Record<string, string> = {}
    
    // Extract response headers
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value
    })
    
    // Extract headers (we can't access response headers directly in this context,
    // but we can check meta tags and other indicators)
    const title = $('title').first().text().trim()
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || ''

    // Parse content type safely
    const contentTypeHeader = headers['content-type'] || ''
    const contentType = contentTypeHeader.split(';')[0].trim() || 'unknown'
    
    // Parse content length safely
    const contentLengthStr = headers['content-length'] || '0'
    const contentLength = parseInt(contentLengthStr, 10) || 0
    
    // Determine if HTTPS
    const finalUrl = response.url || url
    const isHttps = finalUrl.startsWith('https://') || url.startsWith('https://')

    return {
      url,
      html,
      $,
      title,
      description,
      headers,
      httpStatus: response.status,
      finalUrl,
      contentType,
      contentLength,
      isHttps,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout: ${url} took longer than 30 seconds to respond`)
    }
    throw new Error(`Failed to fetch ${url}: ${error}`)
  }
}

/**
 * Performance Module
 * Checks page speed and performance metrics
 */
export async function runPerformanceModule(siteData: SiteData): Promise<ModuleResult> {
  const issues: AuditIssue[] = []
  let score = 100

  // Collect evidence data
  const imageSources: string[] = []
  const blockingScriptSources: string[] = []
  const asyncScriptSources: string[] = []
  const deferScriptSources: string[] = []
  let totalImages = 0
  let imagesWithLazy = 0
  let imagesWithoutLazy = 0

  // Check if site uses HTTPS
  const isHttps = siteData.url.startsWith('https://')
  if (!isHttps) {
    issues.push({
      title: 'Site is not using HTTPS',
      severity: 'high',
      technicalExplanation: 'Site is served over HTTP instead of HTTPS',
      plainLanguageExplanation: 'Your website is not secure. Visitors may see warnings and search engines prefer secure sites.',
      suggestedFix: 'Contact your web hosting provider to enable SSL/HTTPS. Most hosting providers offer free SSL certificates.',
      evidence: {
        found: 'HTTP (not secure)',
        actual: siteData.url,
        expected: 'HTTPS (secure connection)',
      },
    })
    score -= 20
  }

  // Check for images and lazy loading
  const images = siteData.$('img')
  images.each((_, el) => {
    const src = siteData.$(el).attr('src')
    if (src && !src.startsWith('data:')) {
      totalImages++
      imageSources.push(src)
      const loading = siteData.$(el).attr('loading')
      if (loading === 'lazy') {
        imagesWithLazy++
      } else {
        imagesWithoutLazy++
      }
    }
  })

  if (imagesWithoutLazy > 5) {
    issues.push({
      title: 'Images may be slowing down your site',
      severity: 'medium',
      technicalExplanation: `Found ${imagesWithoutLazy} images without lazy loading`,
      plainLanguageExplanation: 'Large images can make your site slow to load, especially on mobile devices.',
      suggestedFix: 'Ask your web designer to add "lazy loading" to images. This makes images load only when visitors scroll to them.',
      evidence: {
        found: `${imagesWithoutLazy} images without lazy loading`,
        actual: `${imagesWithLazy} with lazy loading, ${imagesWithoutLazy} without`,
        expected: 'All images should have loading="lazy" attribute',
        count: imagesWithoutLazy,
      },
    })
    score -= 10
  }

  // Check for render-blocking resources
  const allScripts = siteData.$('script[src]')
  allScripts.each((_, el) => {
    const src = siteData.$(el).attr('src') || ''
    if (src) {
      if (src.includes('async')) {
        asyncScriptSources.push(src)
      } else if (src.includes('defer')) {
        deferScriptSources.push(src)
      } else {
        blockingScriptSources.push(src)
      }
    }
  })

  const blockingScriptsCount = blockingScriptSources.length
  if (blockingScriptsCount > 3) {
    issues.push({
      title: 'Too many scripts may slow page loading',
      severity: 'medium',
      technicalExplanation: `Found ${blockingScriptsCount} scripts that block page rendering`,
      plainLanguageExplanation: 'Scripts can prevent your page from showing quickly to visitors.',
      suggestedFix: 'Ask your web designer to optimize scripts or move them to load after the page content.',
      evidence: {
        found: `${blockingScriptsCount} blocking scripts`,
        actual: `${blockingScriptsCount} blocking, ${asyncScriptSources.length} async, ${deferScriptSources.length} deferred`,
        expected: 'Scripts should use async or defer attributes',
        count: blockingScriptsCount,
        details: {
          blockingScripts: blockingScriptSources.slice(0, 5), // Limit to first 5
        },
      },
    })
    score -= 10
  }

  // Check for external resources that might slow loading
  const externalResources = siteData.$('[src^="http://"], [href^="http://"]').length
  if (externalResources > 0 && isHttps) {
    issues.push({
      title: 'Site may load some content over insecure connection',
      severity: 'medium',
      technicalExplanation: `Found ${externalResources} resources loaded over HTTP`,
      plainLanguageExplanation: 'Loading some content over HTTP can make your site less secure.',
      suggestedFix: 'Update all links and resources to use HTTPS instead of HTTP.',
      evidence: {
        found: `${externalResources} HTTP resources`,
        actual: `${externalResources} resources using HTTP`,
        expected: 'All resources should use HTTPS',
        count: externalResources,
      },
    })
    score -= 5
  }

  // Calculate resource counts
  const totalScripts = allScripts.length
  const totalStylesheets = siteData.$('link[rel="stylesheet"]').length
  const totalResources = totalImages + totalScripts + totalStylesheets

  const summary = score >= 80
    ? 'Your site performance looks good. Consider optimizing images and scripts for even better speed.'
    : score >= 60
    ? 'Your site performance needs improvement. Focus on enabling HTTPS and optimizing images.'
    : 'Your site performance needs significant improvement. Start with HTTPS and image optimization.'

  return {
    moduleKey: 'performance',
    score: Math.max(0, score),
    issues,
    summary,
    evidence: {
      isHttps: isHttps,
      totalImages: totalImages,
      imagesWithLazyLoading: imagesWithLazy,
      imagesWithoutLazyLoading: imagesWithoutLazy,
      totalScripts: totalScripts,
      blockingScripts: blockingScriptsCount,
      asyncScripts: asyncScriptSources.length,
      deferredScripts: deferScriptSources.length,
      totalStylesheets: totalStylesheets,
      totalResources: totalResources,
      externalHttpResources: externalResources,
    },
  }
}

/**
 * On-Page SEO Module
 */
export async function runOnPageModule(siteData: SiteData): Promise<ModuleResult> {
  const issues: AuditIssue[] = []
  let score = 100

  // Check title tag
  const title = siteData.title || ''
  if (!title) {
    issues.push({
      title: 'Missing page title',
      severity: 'high',
      technicalExplanation: 'No <title> tag found',
      plainLanguageExplanation: 'Search engines need a title to understand what your page is about.',
      suggestedFix: 'Add a clear, descriptive title (50-60 characters) that describes your page content.',
      evidence: {
        found: null,
        expected: 'A title tag with 50-60 characters',
      },
    })
    score -= 25
  } else if (title.length < 30) {
    issues.push({
      title: 'Page title is too short',
      severity: 'medium',
      technicalExplanation: `Title is only ${title.length} characters`,
      plainLanguageExplanation: 'Short titles don\'t give search engines enough information.',
      suggestedFix: 'Make your title longer (aim for 50-60 characters) and include your main keywords.',
      evidence: {
        found: title,
        actual: `${title.length} characters`,
        expected: '50-60 characters',
      },
    })
    score -= 10
  } else if (title.length > 60) {
    issues.push({
      title: 'Page title is too long',
      severity: 'low',
      technicalExplanation: `Title is ${title.length} characters (recommended: 50-60)`,
      plainLanguageExplanation: 'Long titles get cut off in search results.',
      suggestedFix: 'Shorten your title to 50-60 characters to ensure it displays fully.',
      evidence: {
        found: title,
        actual: `${title.length} characters`,
        expected: '50-60 characters',
      },
    })
    score -= 5
  }

  // Check meta description
  const description = siteData.description || ''
  if (!description) {
    issues.push({
      title: 'Missing page description',
      severity: 'high',
      technicalExplanation: 'No meta description tag found',
      plainLanguageExplanation: 'Descriptions help people decide if they want to visit your site from search results.',
      suggestedFix: 'Add a description (150-160 characters) that explains what your page offers.',
      evidence: {
        found: null,
        expected: 'A meta description tag with 150-160 characters',
      },
    })
    score -= 20
  } else if (description.length < 120) {
    issues.push({
      title: 'Page description is too short',
      severity: 'medium',
      technicalExplanation: `Description is only ${description.length} characters`,
      plainLanguageExplanation: 'Short descriptions don\'t give enough information to potential visitors.',
      suggestedFix: 'Expand your description to 150-160 characters with more details about your page.',
      evidence: {
        found: description,
        actual: `${description.length} characters`,
        expected: '150-160 characters',
      },
    })
    score -= 10
  }

  // Check H1 tag
  const h1Count = siteData.$('h1').length
  const h1Texts: string[] = []
  siteData.$('h1').each((_, el) => {
    h1Texts.push(siteData.$(el).text().trim())
  })
  
  if (h1Count === 0) {
    issues.push({
      title: 'Missing main heading (H1)',
      severity: 'high',
      technicalExplanation: 'No H1 tag found',
      plainLanguageExplanation: 'The main heading helps search engines and visitors understand your page topic.',
      suggestedFix: 'Add one H1 heading at the top of your main content that describes what the page is about.',
      evidence: {
        found: null,
        expected: 'One H1 tag with the main page heading',
      },
    })
    score -= 20
  } else if (h1Count > 1) {
    issues.push({
      title: 'Multiple main headings found',
      severity: 'medium',
      technicalExplanation: `Found ${h1Count} H1 tags (should be 1)`,
      plainLanguageExplanation: 'Having multiple main headings confuses search engines about your page focus.',
      suggestedFix: 'Keep only one H1 tag and use H2, H3 for other headings.',
      evidence: {
        found: h1Texts,
        actual: `${h1Count} H1 tags found`,
        expected: '1 H1 tag',
        details: { h1Texts },
      },
    })
    score -= 10
  }

  // Check content length
  const textContent = siteData.$('body').text().replace(/\s+/g, ' ').trim()
  const wordCount = textContent.split(' ').filter(w => w.length > 0).length

  if (wordCount < 300) {
    issues.push({
      title: 'Page has very little content',
      severity: 'medium',
      technicalExplanation: `Page has only ${wordCount} words`,
      plainLanguageExplanation: 'Pages with little content don\'t rank well in search results.',
      suggestedFix: 'Add more helpful content to your page (aim for at least 300-500 words).',
      evidence: {
        found: `${wordCount} words`,
        actual: `${wordCount} words`,
        expected: 'At least 300-500 words',
        count: wordCount,
      },
    })
    score -= 15
  }

  // Check image alt text
  const images = siteData.$('img')
  let missingAltCount = 0
  images.each((_, el) => {
    const alt = siteData.$(el).attr('alt')
    const src = siteData.$(el).attr('src')
    if (src && !src.startsWith('data:') && alt === undefined) {
      missingAltCount++
    }
  })

  if (missingAltCount > 0) {
    issues.push({
      title: `${missingAltCount} image${missingAltCount > 1 ? 's' : ''} missing descriptions`,
      severity: missingAltCount > 5 ? 'high' : 'medium',
      technicalExplanation: `${missingAltCount} images without alt attributes`,
      plainLanguageExplanation: 'Image descriptions help search engines understand your images and improve accessibility.',
      suggestedFix: 'Add descriptive alt text to all images describing what they show.',
      evidence: {
        found: `${missingAltCount} images without alt text`,
        actual: `${missingAltCount} missing, ${images.length - missingAltCount} with alt text`,
        expected: 'All images should have descriptive alt text',
        count: missingAltCount,
      },
    })
    score -= Math.min(15, missingAltCount * 2)
  }

  const summary = score >= 80
    ? 'Your on-page SEO is in good shape. Keep titles and descriptions clear and descriptive.'
    : score >= 60
    ? 'Your on-page SEO needs some improvements. Focus on adding titles, descriptions, and proper headings.'
    : 'Your on-page SEO needs significant work. Start with adding a title, description, and main heading.'

  // Collect module-level evidence
  const h1Text = h1Count > 0 ? h1Texts[0] : null
  const h2Count = siteData.$('h2').length
  const h3Count = siteData.$('h3').length
  
  return {
    moduleKey: 'on_page',
    score: Math.max(0, score),
    issues,
    summary,
    evidence: {
      title: title || null,
      titleLength: title ? title.length : 0,
      metaDescription: description || null,
      metaDescriptionLength: description ? description.length : 0,
      h1Text: h1Text,
      h1Count: h1Count,
      h2Count: h2Count,
      h3Count: h3Count,
      wordCount: wordCount,
      imageCount: images.length,
      missingAltCount: missingAltCount,
    },
  }
}

/**
 * Mobile Optimization Module
 */
export async function runMobileModule(siteData: SiteData): Promise<ModuleResult> {
  const issues: AuditIssue[] = []
  let score = 100

  // Check viewport meta tag
  const viewport = siteData.$('meta[name="viewport"]').attr('content')
  if (!viewport) {
    issues.push({
      title: 'Missing mobile viewport setting',
      severity: 'high',
      technicalExplanation: 'No viewport meta tag found',
      plainLanguageExplanation: 'Without this, your site won\'t display properly on phones and tablets.',
      suggestedFix: 'Add this code to your page header: <meta name="viewport" content="width=device-width, initial-scale=1">',
      evidence: {
        found: null,
        expected: '<meta name="viewport" content="width=device-width, initial-scale=1">',
      },
    })
    score -= 30
  } else if (!viewport.includes('width=device-width')) {
    issues.push({
      title: 'Viewport setting may not be optimal',
      severity: 'medium',
      technicalExplanation: 'Viewport tag exists but may not be configured correctly',
      plainLanguageExplanation: 'Your mobile display settings may not be optimal.',
      suggestedFix: 'Update your viewport tag to: <meta name="viewport" content="width=device-width, initial-scale=1">',
      evidence: {
        found: viewport,
        actual: viewport,
        expected: 'width=device-width, initial-scale=1',
      },
    })
    score -= 15
  }

  // Check for fixed width elements (heuristic)
  const bodyStyles = siteData.$('body').attr('style') || ''
  const hasFixedWidth = bodyStyles.includes('width:') && bodyStyles.includes('px')

  if (hasFixedWidth) {
    issues.push({
      title: 'Site may use fixed widths',
      severity: 'medium',
      technicalExplanation: 'Body element may have fixed width styling',
      plainLanguageExplanation: 'Fixed widths can make your site hard to use on small screens.',
      suggestedFix: 'Ask your web designer to use responsive (flexible) widths instead of fixed pixel widths.',
    })
    score -= 10
  }

  // Check font sizes (heuristic)
  const smallTexts = siteData.$('*').filter((_, el) => {
    const style = siteData.$(el).attr('style') || ''
    const fontSize = style.match(/font-size:\s*(\d+)px/)
    return !!(fontSize && parseInt(fontSize[1]) < 14)
  }).length

  if (smallTexts > 5) {
    issues.push({
      title: 'Some text may be too small on mobile',
      severity: 'low',
      technicalExplanation: 'Found elements with font size less than 14px',
      plainLanguageExplanation: 'Small text is hard to read on phones.',
      suggestedFix: 'Ensure all text is at least 14-16 pixels for comfortable mobile reading.',
    })
    score -= 5
  }

  // Check for touch targets (heuristic: look for buttons/links)
  const buttons = siteData.$('button, a[href], input[type="button"], input[type="submit"]')
  const smallButtons = buttons.filter((_, el) => {
    const style = siteData.$(el).attr('style') || ''
    const height = style.match(/height:\s*(\d+)px/)
    return !!(height && parseInt(height[1]) < 44)
  }).length

  const totalButtons = buttons.length

  if (smallButtons > 0) {
    issues.push({
      title: 'Some buttons may be too small for mobile',
      severity: 'low',
      technicalExplanation: 'Found buttons smaller than 44px height',
      plainLanguageExplanation: 'Small buttons are hard to tap on phones.',
      suggestedFix: 'Make sure all buttons and clickable links are at least 44x44 pixels.',
      evidence: {
        found: `${smallButtons} buttons too small`,
        actual: `${smallButtons} buttons smaller than 44px`,
        expected: 'All buttons should be at least 44x44 pixels',
        count: smallButtons,
      },
    })
    score -= 5
  }

  const summary = score >= 80
    ? 'Your site is mobile-friendly. Keep up the good work!'
    : score >= 60
    ? 'Your site works on mobile but could be improved. Add a viewport tag and check button sizes.'
    : 'Your site needs mobile optimization. Start by adding a proper viewport meta tag.'

  return {
    moduleKey: 'mobile',
    score: Math.max(0, score),
    issues,
    summary,
    evidence: {
      viewport: viewport || null,
      hasViewport: !!viewport,
      viewportOptimal: viewport ? viewport.includes('width=device-width') : false,
      hasFixedWidth: hasFixedWidth,
      smallTextElements: smallTexts,
      totalButtons: totalButtons,
      smallButtons: smallButtons,
      touchTargetsOptimal: smallButtons === 0,
    },
  }
}

/**
 * Local SEO Module
 */
export async function runLocalModule(siteData: SiteData): Promise<ModuleResult> {
  const issues: AuditIssue[] = []
  let score = 100

  // Check for address patterns
  const textContent = siteData.$('body').text()
  const addressPattern = /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|circle|cir|court|ct)/i
  const hasAddress = addressPattern.test(textContent)

  // Check for phone patterns
  const phonePattern = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/
  const hasPhone = phonePattern.test(textContent)

  // Check for city/state patterns
  const cityStatePattern = /[A-Z][a-z]+,\s*[A-Z]{2}\s+\d{5}/
  const hasCityState = cityStatePattern.test(textContent)

  if (!hasAddress) {
    issues.push({
      title: 'Business address not found',
      severity: 'high',
      technicalExplanation: 'No address pattern detected in page content',
      plainLanguageExplanation: 'Local customers need to find your address easily.',
      suggestedFix: 'Add your complete business address (street, city, state, zip) to your website, preferably in the footer or contact page.',
    })
    score -= 25
  }

  if (!hasPhone) {
    issues.push({
      title: 'Phone number not found',
      severity: 'high',
      technicalExplanation: 'No phone number pattern detected',
      plainLanguageExplanation: 'Customers need an easy way to call you.',
      suggestedFix: 'Add your business phone number prominently on your site, ideally in the header or footer.',
    })
    score -= 25
  }

  if (!hasCityState) {
    issues.push({
      title: 'City and state information not clearly visible',
      severity: 'medium',
      technicalExplanation: 'City/state pattern not detected',
      plainLanguageExplanation: 'Clear location information helps local customers find you.',
      suggestedFix: 'Make sure your city and state are clearly visible on your website.',
    })
    score -= 15
  }

  // Check for LocalBusiness schema
  const schemas = siteData.$('script[type="application/ld+json"]')
  let hasLocalSchema = false
  schemas.each((_, el) => {
    try {
      const json = JSON.parse(siteData.$(el).html() || '{}')
      if (json['@type'] === 'LocalBusiness' || json['@type'] === 'Organization') {
        hasLocalSchema = true
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  })

  if (!hasLocalSchema) {
    issues.push({
      title: 'Missing structured business information',
      severity: 'medium',
      technicalExplanation: 'No LocalBusiness or Organization schema found',
      plainLanguageExplanation: 'Structured data helps Google show your business in local search results.',
      suggestedFix: 'Add structured data (schema markup) with your business name, address, phone, and hours. Ask your web designer about "LocalBusiness schema".',
    })
    score -= 20
  }

  // Check for Google Maps embed or link
  const hasGoogleMaps = 
    siteData.$('iframe[src*="google.com/maps"]').length > 0 ||
    siteData.$('a[href*="google.com/maps"]').length > 0 ||
    textContent.toLowerCase().includes('google maps') ||
    textContent.toLowerCase().includes('google business')

  if (!hasGoogleMaps) {
    issues.push({
      title: 'No Google Maps integration found',
      severity: 'low',
      technicalExplanation: 'No Google Maps embed or link detected',
      plainLanguageExplanation: 'A map helps customers find your location easily.',
      suggestedFix: 'Add a Google Maps embed or link to your Google Business Profile on your contact page.',
    })
    score -= 10
  }

  const summary = score >= 80
    ? 'Your local SEO is well set up. Customers can easily find your location and contact information.'
    : score >= 60
    ? 'Your local SEO needs improvement. Add your address, phone number, and consider adding structured data.'
    : 'Your local SEO needs significant work. Start by adding your complete business address and phone number.'

  return {
    moduleKey: 'local',
    score: Math.max(0, score),
    issues,
    summary,
  }
}

/**
 * Accessibility Module
 */
export async function runAccessibilityModule(siteData: SiteData): Promise<ModuleResult> {
  const issues: AuditIssue[] = []
  let score = 100

  // Check image alt text
  const images = siteData.$('img')
  let missingAltCount = 0
  images.each((_, el) => {
    const alt = siteData.$(el).attr('alt')
    const src = siteData.$(el).attr('src')
    if (src && !src.startsWith('data:') && alt === undefined) {
      missingAltCount++
    }
  })

  if (missingAltCount > 0) {
    issues.push({
      title: `${missingAltCount} image${missingAltCount > 1 ? 's' : ''} missing descriptions`,
      severity: missingAltCount > 5 ? 'high' : 'medium',
      technicalExplanation: `${missingAltCount} images without alt attributes`,
      plainLanguageExplanation: 'Image descriptions help people using screen readers understand your images.',
      suggestedFix: 'Add descriptive alt text to all images. For decorative images, use alt="".',
    })
    score -= Math.min(20, missingAltCount * 3)
  }

  // Check for form labels
  const inputs = siteData.$('input[type="text"], input[type="email"], input[type="tel"], textarea, select')
  let missingLabelCount = 0
  inputs.each((_, el) => {
    const id = siteData.$(el).attr('id')
    const name = siteData.$(el).attr('name')
    const placeholder = siteData.$(el).attr('placeholder')
    const ariaLabel = siteData.$(el).attr('aria-label')
    
    if (id) {
      const label = siteData.$(`label[for="${id}"]`)
      if (label.length === 0 && !ariaLabel && !placeholder) {
        missingLabelCount++
      }
    } else if (!ariaLabel && !placeholder) {
      missingLabelCount++
    }
  })

  if (missingLabelCount > 0) {
    issues.push({
      title: `${missingLabelCount} form field${missingLabelCount > 1 ? 's' : ''} missing labels`,
      severity: missingLabelCount > 3 ? 'high' : 'medium',
      technicalExplanation: `${missingLabelCount} form inputs without proper labels`,
      plainLanguageExplanation: 'Form fields need labels so everyone knows what information to enter.',
      suggestedFix: 'Add labels to all form fields. Use <label> tags or aria-label attributes.',
    })
    score -= Math.min(20, missingLabelCount * 5)
  }

  // Check heading hierarchy
  const headings = siteData.$('h1, h2, h3, h4, h5, h6')
  let hierarchyIssues = 0
  let lastLevel = 0

  headings.each((_, el) => {
    const tagName = el.tagName.toLowerCase()
    const level = parseInt(tagName.charAt(1))
    
    if (lastLevel > 0 && level > lastLevel + 1) {
      hierarchyIssues++
    }
    lastLevel = level
  })

  if (hierarchyIssues > 0) {
    issues.push({
      title: 'Heading structure may be confusing',
      severity: 'low',
      technicalExplanation: 'Headings skip levels (e.g., H1 to H3)',
      plainLanguageExplanation: 'Proper heading order helps screen readers navigate your page.',
      suggestedFix: 'Use headings in order: H1 first, then H2, then H3, etc. Don\'t skip levels.',
    })
    score -= 5
  }

  // Check for sufficient color contrast (heuristic: check for low contrast indicators)
  const lowContrastElements = siteData.$('[style*="color:"]').filter((_, el) => {
    const style = siteData.$(el).attr('style') || ''
    // Very basic check - in production, use a proper contrast checker
    return style.includes('color: gray') || style.includes('color: #999')
  }).length

  if (lowContrastElements > 5) {
    issues.push({
      title: 'Some text may have low contrast',
      severity: 'medium',
      technicalExplanation: 'Found elements with potentially low color contrast',
      plainLanguageExplanation: 'Low contrast text is hard to read, especially for people with vision difficulties.',
      suggestedFix: 'Ensure all text has sufficient contrast with its background. Use dark text on light backgrounds or vice versa.',
    })
    score -= 10
  }

  const summary = score >= 80
    ? 'Your site is accessible. Good job making your site usable for everyone!'
    : score >= 60
    ? 'Your site accessibility needs improvement. Focus on adding alt text to images and labels to forms.'
    : 'Your site needs significant accessibility improvements. Start with image descriptions and form labels.'

  return {
    moduleKey: 'accessibility',
    score: Math.max(0, score),
    issues,
    summary,
  }
}

/**
 * Security Module
 */
export async function runSecurityModule(siteData: SiteData): Promise<ModuleResult> {
  const issues: AuditIssue[] = []
  let score = 100

  // Check HTTPS
  if (!siteData.url.startsWith('https://')) {
    issues.push({
      title: 'Site is not using HTTPS',
      severity: 'high',
      technicalExplanation: 'Site is served over HTTP instead of HTTPS',
      plainLanguageExplanation: 'HTTPS encrypts data between your site and visitors, protecting sensitive information.',
      suggestedFix: 'Contact your hosting provider to enable SSL/HTTPS. Most providers offer free SSL certificates.',
    })
    score -= 40
  }

  // Check for mixed content (HTTP resources on HTTPS page)
  if (siteData.url.startsWith('https://')) {
    const httpResources = siteData.$('[src^="http://"], [href^="http://"]').length
    if (httpResources > 0) {
      issues.push({
        title: 'Site may load some content over insecure connection',
        severity: 'medium',
        technicalExplanation: `Found ${httpResources} resources loaded over HTTP`,
        plainLanguageExplanation: 'Loading some content over HTTP can make your site less secure.',
        suggestedFix: 'Update all links and resources to use HTTPS instead of HTTP.',
      })
      score -= 15
    }
  }

  // Check for security headers (basic check via meta tags)
  // Note: Real security headers are in HTTP response headers, not HTML
  // This is a placeholder - in production, check actual response headers

  const summary = score >= 80
    ? 'Your site security looks good. Make sure HTTPS is enabled and keep it that way.'
    : score >= 60
    ? 'Your site security needs improvement. Enable HTTPS as soon as possible.'
    : 'Your site security needs immediate attention. Enable HTTPS to protect your visitors.'

  return {
    moduleKey: 'security',
    score: Math.max(0, score),
    issues,
    summary,
  }
}

/**
 * Schema Markup Module
 */
export async function runSchemaModule(siteData: SiteData): Promise<ModuleResult> {
  const issues: AuditIssue[] = []
  let score = 100

  // Check for JSON-LD schema
  const schemas = siteData.$('script[type="application/ld+json"]')
  let schemaCount = 0
  let hasOrganization = false
  let hasLocalBusiness = false

  schemas.each((_, el) => {
    try {
      const json = JSON.parse(siteData.$(el).html() || '{}')
      schemaCount++
      
      if (json['@type'] === 'Organization' || json['@type'] === 'LocalBusiness') {
        hasOrganization = true
        if (json['@type'] === 'LocalBusiness') {
          hasLocalBusiness = true
        }
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  })

  if (schemaCount === 0) {
    issues.push({
      title: 'No structured data found',
      severity: 'high',
      technicalExplanation: 'No JSON-LD schema markup detected',
      plainLanguageExplanation: 'Structured data helps search engines understand your business and show rich results.',
      suggestedFix: 'Add schema markup (structured data) with your business information. Ask your web designer about "Organization schema" or "LocalBusiness schema".',
    })
    score -= 30
  } else if (!hasOrganization && !hasLocalBusiness) {
    issues.push({
      title: 'Missing business organization schema',
      severity: 'medium',
      technicalExplanation: 'Schema found but not Organization or LocalBusiness type',
      plainLanguageExplanation: 'Business schema helps Google show your business information in search results.',
      suggestedFix: 'Add Organization or LocalBusiness schema with your business name, address, phone, and website.',
    })
    score -= 20
  }

  // Check if schema has required fields
  if (hasOrganization || hasLocalBusiness) {
    schemas.each((_, el) => {
      try {
        const json = JSON.parse(siteData.$(el).html() || '{}')
        if (json['@type'] === 'Organization' || json['@type'] === 'LocalBusiness') {
          if (!json.name) {
            issues.push({
              title: 'Schema missing business name',
              severity: 'medium',
              technicalExplanation: 'Organization/LocalBusiness schema missing name field',
              plainLanguageExplanation: 'Your business schema needs a name field.',
              suggestedFix: 'Add a "name" field to your schema markup with your business name.',
            })
            score -= 10
          }
          if (!json.url && !json.sameAs) {
            issues.push({
              title: 'Schema missing website URL',
              severity: 'low',
              technicalExplanation: 'Schema missing url or sameAs field',
              plainLanguageExplanation: 'Adding your website URL to schema helps search engines connect your business to your site.',
              suggestedFix: 'Add a "url" field to your schema with your website address.',
            })
            score -= 5
          }
        }
      } catch (e) {
        // Skip invalid JSON
      }
    })
  }

  const summary = score >= 80
    ? 'Your structured data is well implemented. This helps search engines understand your business.'
    : score >= 60
    ? 'Your structured data needs improvement. Add Organization or LocalBusiness schema with complete business information.'
    : 'Your site needs structured data. Add schema markup to help search engines understand your business.'

  return {
    moduleKey: 'schema',
    score: Math.max(0, score),
    issues,
    summary,
  }
}

/**
 * Social Metadata Module
 */
export async function runSocialModule(siteData: SiteData): Promise<ModuleResult> {
  const issues: AuditIssue[] = []
  let score = 100

  // Check Open Graph tags
  const ogTitle = siteData.$('meta[property="og:title"]').attr('content')
  const ogDescription = siteData.$('meta[property="og:description"]').attr('content')
  const ogImage = siteData.$('meta[property="og:image"]').attr('content')
  const ogUrl = siteData.$('meta[property="og:url"]').attr('content')

  if (!ogTitle) {
    issues.push({
      title: 'Missing Facebook sharing title',
      severity: 'medium',
      technicalExplanation: 'No og:title meta tag found',
      plainLanguageExplanation: 'When someone shares your site on Facebook, it needs a title to display.',
      suggestedFix: 'Add: <meta property="og:title" content="Your Page Title">',
    })
    score -= 10
  }

  if (!ogDescription) {
    issues.push({
      title: 'Missing Facebook sharing description',
      severity: 'medium',
      technicalExplanation: 'No og:description meta tag found',
      plainLanguageExplanation: 'A description makes your shared link more appealing on Facebook.',
      suggestedFix: 'Add: <meta property="og:description" content="Your page description">',
    })
    score -= 10
  }

  if (!ogImage) {
    issues.push({
      title: 'Missing Facebook sharing image',
      severity: 'low',
      technicalExplanation: 'No og:image meta tag found',
      plainLanguageExplanation: 'An image makes your shared link stand out on Facebook.',
      suggestedFix: 'Add: <meta property="og:image" content="https://yoursite.com/image.jpg">',
    })
    score -= 5
  }

  // Check Twitter Card tags
  const twitterCard = siteData.$('meta[name="twitter:card"]').attr('content')
  const twitterTitle = siteData.$('meta[name="twitter:title"]').attr('content')
  const twitterDescription = siteData.$('meta[name="twitter:description"]').attr('content')
  const twitterImage = siteData.$('meta[name="twitter:image"]').attr('content')

  if (!twitterCard && !twitterTitle) {
    issues.push({
      title: 'Missing Twitter Card tags',
      severity: 'low',
      technicalExplanation: 'No Twitter Card meta tags found',
      plainLanguageExplanation: 'Twitter Cards make your shared links look better on Twitter.',
      suggestedFix: 'Add Twitter Card tags: <meta name="twitter:card" content="summary"> and related tags.',
    })
    score -= 10
  }

  const summary = score >= 80
    ? 'Your social sharing is well configured. Your links will look great when shared!'
    : score >= 60
    ? 'Your social sharing needs some improvement. Add Open Graph tags for better Facebook sharing.'
    : 'Your social sharing needs work. Add Open Graph and Twitter Card tags to improve how your site looks when shared.'

  return {
    moduleKey: 'social',
    score: Math.max(0, score),
    issues,
    summary,
  }
}

/**
 * Crawl Health Module
 */
export async function runCrawlHealthModule(siteData: SiteData): Promise<ModuleResult> {
  const issues: AuditIssue[] = []
  let score = 100

  // Check for sitemap.xml
  try {
    const sitemapUrl = new URL('/sitemap.xml', siteData.url).toString()
    const sitemapController = new AbortController()
    const sitemapTimeout = setTimeout(() => sitemapController.abort(), 5000)
    const sitemapResponse = await fetch(sitemapUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO CheckSite/1.0)' },
      signal: sitemapController.signal,
    })
    clearTimeout(sitemapTimeout)
    
    if (!sitemapResponse.ok) {
      issues.push({
        title: 'Sitemap file not found',
        severity: 'high',
        technicalExplanation: 'sitemap.xml not accessible',
        plainLanguageExplanation: 'A sitemap helps search engines find all your pages.',
        suggestedFix: 'Create a sitemap.xml file and place it in your website root. Many website builders create this automatically.',
      })
      score -= 25
    }
  } catch (error) {
    issues.push({
      title: 'Sitemap file not found',
      severity: 'high',
      technicalExplanation: 'Could not access sitemap.xml',
      plainLanguageExplanation: 'A sitemap helps search engines find all your pages.',
      suggestedFix: 'Create a sitemap.xml file and place it in your website root. Many website builders create this automatically.',
    })
    score -= 25
  }

  // Check for robots.txt
  try {
    const robotsUrl = new URL('/robots.txt', siteData.url).toString()
    const robotsController = new AbortController()
    const robotsTimeout = setTimeout(() => robotsController.abort(), 5000)
    const robotsResponse = await fetch(robotsUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO CheckSite/1.0)' },
      signal: robotsController.signal,
    })
    clearTimeout(robotsTimeout)
    
    if (!robotsResponse.ok) {
      issues.push({
        title: 'Robots.txt file not found',
        severity: 'low',
        technicalExplanation: 'robots.txt not accessible',
        plainLanguageExplanation: 'A robots.txt file tells search engines which pages they can and cannot access.',
        suggestedFix: 'Create a robots.txt file in your website root. For most sites, you can use: User-agent: *\nAllow: /',
      })
      score -= 10
    } else {
      const robotsContent = await robotsResponse.text()
      // Check for "Disallow: /" as a standalone directive (not "Disallow: /api/" or similar)
      // Use regex to match "Disallow: /" followed by whitespace or end of line
      const blockingPattern = /disallow:\s*\/\s*$/mi
      if (blockingPattern.test(robotsContent)) {
        issues.push({
          title: 'Robots.txt may be blocking search engines',
          severity: 'high',
          technicalExplanation: 'robots.txt contains "Disallow: /" which blocks all pages',
          plainLanguageExplanation: 'Your robots.txt file might be preventing search engines from finding your pages.',
          suggestedFix: 'Check your robots.txt file and make sure it\'s not blocking all pages. Remove "Disallow: /" unless you want to block search engines.',
          evidence: {
            found: robotsContent,
            actual: 'Contains "Disallow: /" which blocks all pages',
            expected: 'Should allow search engines to crawl pages (e.g., "User-agent: *\nAllow: /")',
          },
        })
        score -= 30
      }
    }
  } catch (error) {
    issues.push({
      title: 'Robots.txt file not found',
      severity: 'low',
      technicalExplanation: 'Could not access robots.txt',
      plainLanguageExplanation: 'A robots.txt file tells search engines which pages they can and cannot access.',
      suggestedFix: 'Create a robots.txt file in your website root. For most sites, you can use: User-agent: *\nAllow: /',
    })
    score -= 10
  }

  // Check for internal links (heuristic) - safely extract hostname
  let internalLinks = 0
  try {
    const hostname = new URL(siteData.url).hostname
    internalLinks = siteData.$('a[href^="/"], a[href*="' + hostname + '"]').length
  } catch (urlError) {
    // If URL is invalid, just count absolute paths
    internalLinks = siteData.$('a[href^="/"]').length
  }
  // More lenient for small sites - only flag if very few links (less than 3)
  // Small 1-3 page sites may legitimately have fewer links
  if (internalLinks < 3) {
    issues.push({
      title: 'Few internal links found',
      severity: 'low',
      technicalExplanation: `Only ${internalLinks} internal links detected`,
      plainLanguageExplanation: 'Internal links help search engines discover all your pages.',
      suggestedFix: 'Add links between your pages. Link from your homepage to important pages, and from those pages back to your homepage.',
      evidence: {
        found: `${internalLinks} internal links`,
        actual: `${internalLinks} links`,
        expected: internalLinks === 0 ? 'At least 1-2 internal links per page' : 'Consider adding more internal links (3+ recommended)',
      },
    })
    score -= 5 // Reduced penalty for small sites
  }

  // Check for broken links (sample up to 10 links to avoid timeout)
  const allLinks = siteData.$('a[href]')
  const linkUrls: string[] = []
  allLinks.each((_, el) => {
    const href = siteData.$(el).attr('href')
    if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:')) {
      try {
        // Handle relative URLs and absolute URLs
        let linkUrl: string
        if (href.startsWith('http://') || href.startsWith('https://')) {
          linkUrl = href
        } else if (href.startsWith('/')) {
          // Absolute path on same domain
          try {
            const baseUrl = new URL(siteData.url)
            linkUrl = `${baseUrl.protocol}//${baseUrl.host}${href}`
          } catch {
            // Invalid base URL, skip
            return
          }
        } else {
          // Relative URL
          try {
            linkUrl = new URL(href, siteData.url).toString()
          } catch {
            // Invalid URL, skip
            return
          }
        }
        linkUrls.push(linkUrl)
      } catch {
        // Invalid URL, skip
      }
    }
  })

  const brokenLinks: string[] = []
  const linksToCheck = linkUrls.slice(0, 5) // Limit to first 5 to avoid timeout
  
  for (const linkUrl of linksToCheck) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => {
        controller.abort()
      }, 3000) // 3 second timeout per link (reduced for speed)
      
      try {
        const response = await fetch(linkUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO CheckSite/1.0)' },
          signal: controller.signal,
          method: 'HEAD', // Use HEAD to check without downloading
          redirect: 'follow',
        })
        
        clearTimeout(timeout)
        
        // 405 = Method Not Allowed means HEAD isn't supported, but GET might work
        // 429 = Too Many Requests is temporary, not broken
        if (!response.ok && response.status !== 405 && response.status !== 429) {
          brokenLinks.push(linkUrl)
        }
      } catch (fetchError) {
        clearTimeout(timeout)
        // Check if it's an abort error (timeout) or actual error
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          // Timeout - consider it potentially broken but don't count as definitely broken
          console.warn(`Link check timeout for ${linkUrl}`)
        } else {
          // Other error - likely broken
          brokenLinks.push(linkUrl)
        }
      }
    } catch (error) {
      // Unexpected error - mark as broken
      console.error(`Error checking link ${linkUrl}:`, error)
      brokenLinks.push(linkUrl)
    }
  }

  if (brokenLinks.length > 0) {
    issues.push({
      title: `${brokenLinks.length} broken link${brokenLinks.length > 1 ? 's' : ''} found`,
      severity: brokenLinks.length > 3 ? 'high' : 'medium',
      technicalExplanation: `Found ${brokenLinks.length} links that return errors`,
      plainLanguageExplanation: 'Broken links frustrate visitors and hurt your site\'s reputation. Visitors clicking broken links will see error pages.',
      suggestedFix: 'Fix or remove the broken links. Check each link to make sure it goes to a working page.',
      evidence: {
        found: brokenLinks,
        actual: `${brokenLinks.length} broken links`,
        expected: 'All links should work',
        count: brokenLinks.length,
        details: { brokenLinks: brokenLinks.slice(0, 5) }, // Limit to first 5 for display
      },
    })
    score -= Math.min(20, brokenLinks.length * 5)
  }

  const summary = score >= 80
    ? 'Search engines should be able to find your pages easily. Make sure you have a sitemap.xml file.'
    : score >= 60
    ? 'Your crawl health needs improvement. Create a sitemap.xml file to help search engines find all your pages.'
    : 'Your crawl health needs work. Start by creating a sitemap.xml file and checking your robots.txt file.'
  
  // Collect module-level evidence
  let robotsContent: string | null = null
  try {
    const robotsUrl = new URL('/robots.txt', siteData.url).toString()
    const robotsResponse = await fetch(robotsUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO CheckSite/1.0)' },
    })
    if (robotsResponse.ok) {
      robotsContent = await robotsResponse.text()
    }
  } catch {
    // robots.txt not accessible
  }
  
  return {
    moduleKey: 'crawl_health',
    score: Math.max(0, score),
    issues,
    summary,
    evidence: {
      robotsTxtContent: robotsContent,
      internalLinksCount: internalLinks,
      totalLinksChecked: linkUrls.length > 0 ? Math.min(10, linkUrls.length) : 0,
      brokenLinksCount: brokenLinks.length,
      sitemapExists: false, // Will be set if sitemap check passes
    },
  }
}

/**
 * Competitor Overview Module
 */
export async function runCompetitorOverviewModule(siteData: SiteData): Promise<ModuleResult> {
  const issues: AuditIssue[] = []
  let score = 75 // Default score since we can't do full competitor analysis

  // Extract domain to suggest competitors
  // Safely extract domain
  let domain = siteData.url
  try {
    domain = new URL(siteData.url).hostname.replace('www.', '')
  } catch (urlError) {
    // If URL parsing fails, try to extract domain manually
    const match = siteData.url.match(/https?:\/\/([^\/]+)/)
    if (match) {
      domain = match[1].replace('www.', '')
    }
  }
  const domainParts = domain.split('.')
  const businessName = domainParts[0] // First part of domain

  // Generic competitor insights based on common patterns
  issues.push({
    title: 'Monitor your top competitors',
    severity: 'low',
    technicalExplanation: 'Competitor analysis requires manual research',
    plainLanguageExplanation: 'Understanding what your competitors do well can help you improve your own site.',
    suggestedFix: `Research 3-5 businesses similar to yours. Check their websites, see what content they have, and note what they do well. Look for businesses in your area or industry that rank well in search results.`,
  })

  // Check if site has unique content (heuristic)
  const textContent = siteData.$('body').text().trim()
  const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length

  if (wordCount < 500) {
    issues.push({
      title: 'Your site may need more content than competitors',
      severity: 'medium',
      technicalExplanation: `Site has only ${wordCount} words`,
      plainLanguageExplanation: 'Competitors with more detailed content often rank better in search results.',
      suggestedFix: 'Add more helpful content to your pages. Aim for at least 500-1000 words per main page with useful information about your business.',
    })
    score -= 15
  }

  issues.push({
    title: 'Keep your content fresh and updated',
    severity: 'low',
    technicalExplanation: 'Content freshness is important for SEO',
    plainLanguageExplanation: 'Competitors who regularly update their content tend to rank better.',
    suggestedFix: 'Update your website content regularly. Add new pages, update existing content, and keep information current. Aim to add or update content at least once a month.',
  })

  const summary = score >= 80
    ? 'Focus on creating unique, helpful content that sets you apart from competitors.'
    : score >= 60
    ? 'Research your competitors and identify opportunities to improve your content and online presence.'
    : 'Your site needs more content to compete effectively. Research competitors and create more detailed, helpful content.'
  
  return {
    moduleKey: 'competitor_overview',
    score: Math.max(0, score),
    issues,
    summary,
  }
}

/**
 * Run all enabled modules
 */
export async function runAuditModules(
  url: string,
  enabledModules: ModuleKey[]
): Promise<{ results: ModuleResult[]; siteData: SiteData }> {
  const siteData = await fetchSite(url)
  const results: ModuleResult[] = []

  const moduleMap: Record<ModuleKey, (data: SiteData) => Promise<ModuleResult>> = {
    performance: runPerformanceModule,
    crawl_health: runCrawlHealthModule,
    on_page: runOnPageModule,
    mobile: runMobileModule,
    local: runLocalModule,
    accessibility: runAccessibilityModule,
    security: runSecurityModule,
    schema: runSchemaModule,
    social: runSocialModule,
    competitor_overview: runCompetitorOverviewModule,
  }

  // Run modules in parallel for speed (they all use the same siteData)
  const modulePromises = enabledModules.map(async (moduleKey) => {
    if (moduleMap[moduleKey]) {
      try {
        const result = await moduleMap[moduleKey](siteData)
        return result
      } catch (error) {
        console.error(`Error running module ${moduleKey}:`, error)
        return {
          moduleKey,
          score: 0,
          issues: [
            {
              title: `Error running ${moduleKey} check`,
              severity: 'low',
              technicalExplanation: String(error),
              plainLanguageExplanation: 'An error occurred while checking this aspect of your site.',
              suggestedFix: 'Please try again or contact support.',
            },
          ],
          summary: 'Unable to complete this check.',
        }
      }
    }
    return null
  })

  const moduleResults = await Promise.all(modulePromises)
  results.push(...moduleResults.filter((r): r is ModuleResult => r !== null))

  return { results, siteData }
}

