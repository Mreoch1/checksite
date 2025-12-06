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
 * Site type detection
 * Determines the type of website to apply appropriate validation rules
 */
type SiteType = 'publisher' | 'blog' | 'saas' | 'local_business' | 'ecommerce' | 'enterprise' | 'unknown'

function detectSiteType(siteData: SiteData): SiteType {
  try {
    const url = new URL(siteData.url)
    const hostname = url.hostname.toLowerCase()
    const title = (siteData.title || '').toLowerCase()
    const bodyText = siteData.$('body').text().toLowerCase()
    
    // Check for known publisher/news sites
    const publisherPatterns = [
      /theverge\.com/i, /bbc\.com/i, /cnn\.com/i, /nytimes\.com/i,
      /washingtonpost\.com/i, /guardian\.com/i, /reuters\.com/i,
      /techcrunch\.com/i, /wired\.com/i, /forbes\.com/i
    ]
    if (publisherPatterns.some(pattern => pattern.test(hostname))) {
      return 'publisher'
    }
    
    // Check for news/article schema
    const schemas = siteData.$('script[type="application/ld+json"]')
    let hasNewsArticle = false
    let hasPublisher = false
    schemas.each((_, el) => {
      try {
        const jsonText = siteData.$(el).html() || '{}'
        const json = JSON.parse(jsonText)
        const checkSchema = (obj: any) => {
          if (Array.isArray(obj)) {
            obj.forEach(checkSchema)
          } else if (obj['@graph']) {
            checkSchema(obj['@graph'])
          } else if (obj['@type']) {
            if (obj['@type'] === 'NewsArticle' || obj['@type'] === 'Article' || obj['@type'] === 'BlogPosting') {
              hasNewsArticle = true
            }
            if (obj['@type'] === 'Publisher' || (obj['@type'] === 'Organization' && obj.publisher)) {
              hasPublisher = true
            }
          }
        }
        checkSchema(json)
      } catch {}
    })
    if (hasNewsArticle || hasPublisher) {
      return 'publisher'
    }
    
    // Check for blog indicators
    if (bodyText.includes('blog') || bodyText.includes('post') || 
        siteData.$('article, .post, .blog-post').length > 0) {
      return 'blog'
    }
    
    // Check for ecommerce indicators
    if (bodyText.includes('add to cart') || bodyText.includes('buy now') ||
        siteData.$('[data-product], .product, .cart').length > 0) {
      return 'ecommerce'
    }
    
    // Check for SaaS indicators
    if (bodyText.includes('sign up') || bodyText.includes('free trial') ||
        bodyText.includes('pricing') || siteData.$('.pricing, .signup').length > 0) {
      return 'saas'
    }
    
    // Check for local business indicators
    if (bodyText.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/) || // Phone number
        bodyText.match(/\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|way|lane|ln)/i) || // Address
        siteData.$('[itemtype*="LocalBusiness"]').length > 0) {
      return 'local_business'
    }
    
    // Check for enterprise/large organization
    const enterprisePatterns = [
      /\.gov$/, /\.edu$/, /\.org$/,
      /nasa\.gov/i, /wikipedia\.org/i,
      /microsoft\.com/i, /apple\.com/i, /google\.com/i
    ]
    if (enterprisePatterns.some(pattern => pattern.test(hostname))) {
      return 'enterprise'
    }
    
    // Check for large content size (enterprise sites often have more content)
    const wordCount = bodyText.split(/\s+/).filter(w => w.length > 0).length
    if (wordCount > 5000) {
      return 'enterprise'
    }
    
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Detect if a site is likely an enterprise/large organization
 * Based on domain patterns, content size, and other heuristics
 */
function isEnterpriseSite(siteData: SiteData): boolean {
  return detectSiteType(siteData) === 'enterprise' || detectSiteType(siteData) === 'publisher'
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
  // Count all img tags (matching pageAnalysis counting method)
  const images = siteData.$('img')
  images.each((_, el) => {
    const src = siteData.$(el).attr('src')
    // Count all images (including data URIs) to match pageAnalysis
    totalImages++
    if (src && !src.startsWith('data:')) {
      imageSources.push(src)
      const loading = siteData.$(el).attr('loading')
      if (loading === 'lazy') {
        imagesWithLazy++
      } else {
        imagesWithoutLazy++
      }
    }
  })

  // Suggest lazy loading for any images without it (even if just a few)
  if (imagesWithoutLazy > 0) {
    const severity = imagesWithoutLazy > 5 ? 'medium' : 'low'
    issues.push({
      title: imagesWithoutLazy > 5 
        ? 'Images may be slowing down your site'
        : 'Consider adding lazy loading to images',
      severity,
      technicalExplanation: `Found ${imagesWithoutLazy} images without lazy loading`,
      plainLanguageExplanation: imagesWithoutLazy > 5
        ? 'Large images can make your site slow to load, especially on mobile devices.'
        : 'Adding lazy loading to images can help your pages load faster.',
      suggestedFix: 'Implementation tip: Add loading="lazy" to your images. This makes images load only when visitors scroll to them.',
      evidence: {
        found: `${imagesWithoutLazy} images without lazy loading`,
        actual: `${imagesWithLazy} with lazy loading, ${imagesWithoutLazy} without`,
        expected: 'All images should have loading="lazy" attribute',
        count: imagesWithoutLazy,
      },
    })
    score -= imagesWithoutLazy > 5 ? 10 : 5
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
      suggestedFix: 'Implementation tip: Optimize scripts or move them to load after the page content.',
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
  // Only check actual resources (src), not links (href)
  const httpResources = siteData.$('[src^="http://"]').length
  if (httpResources > 0 && isHttps) {
    issues.push({
      title: 'Some external resources are referenced over HTTP',
      severity: 'low',
      technicalExplanation: `Found ${httpResources} resources with HTTP sources on HTTPS page`,
      plainLanguageExplanation: 'While your page loads securely, some external resources are referenced over HTTP. It is best practice to update all assets to HTTPS where possible.',
      suggestedFix: 'Update all resource URLs (images, scripts, stylesheets) to use HTTPS instead of HTTP where possible.',
      evidence: {
        found: `${httpResources} HTTP resources`,
        actual: `${httpResources} resources using HTTP`,
        expected: 'All resources should use HTTPS',
        count: httpResources,
      },
    })
    score -= 3 // Reduced severity - not a vulnerability if page loads securely
  }

  // Calculate resource counts
  const totalScripts = allScripts.length
  const totalStylesheets = siteData.$('link[rel="stylesheet"]').length
  const totalResources = totalImages + totalScripts + totalStylesheets

  // Adjust summary based on whether there are issues and available resources
  const hasIssues = issues.length > 0
  const hasImages = totalImages > 0
  
  const summary = score >= 80
    ? hasIssues 
      ? 'Your site performance looks good. We found one small improvement opportunity.'
      : hasImages
        ? 'Your site performance looks good. Consider optimizing images and scripts for even better speed.'
        : 'Your site performance looks good. Consider optimizing scripts and resources for even better speed.'
    : score >= 60
    ? hasImages
      ? 'Your site performance needs improvement. Focus on optimizing images and scripts.'
      : 'Your site performance needs improvement. Focus on optimizing scripts and resources.'
    : hasImages
    ? 'Your site performance needs significant improvement. Start with image and script optimization.'
    : 'Your site performance needs significant improvement. Start with script and resource optimization.'

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
      externalHttpResources: httpResources,
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
    const siteType = detectSiteType(siteData)
    const isEnterprise = isEnterpriseSite(siteData)
    const isBrandOnly = title.length < 10 && /^[A-Z\s]+$/.test(title) // Likely just brand name
    const isPublisher = siteType === 'publisher'
    
    // Only flag title length if:
    // - Title is very short (< 25 chars) AND not a high-authority publisher/enterprise
    // - OR title lacks keywords (very generic)
    const isVeryShort = title.length < 25
    const hasKeywords = title.split(/\s+/).length > 1 // More than one word
    
    if (isVeryShort && !isPublisher && !isEnterprise) {
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
    } else if (isEnterprise && isBrandOnly) {
      // Enterprise brand-only titles are acceptable
      issues.push({
        title: 'Homepage uses brand-only title',
        severity: 'low',
        technicalExplanation: `Title is only ${title.length} characters`,
        plainLanguageExplanation: 'Enterprise websites often rely on brand recognition for homepage titles. If discoverability is a goal, consider adding a descriptive subtitle after the brand name.',
        suggestedFix: 'If discoverability is a goal, consider adding a descriptive subtitle after the brand name. For example: "NASA - National Aeronautics and Space Administration" instead of just "NASA".',
        evidence: {
          found: title,
          actual: `${title.length} characters`,
          expected: '50-60 characters recommended for discoverability',
        },
      })
      score -= 3 // Very minor penalty
    } else if (isPublisher && title.length >= 25) {
      // Publishers often use short, branded titles - this is acceptable
      // Don't flag unless extremely short
    }
  } else if (title.length > 65) {
    // More lenient: only flag if significantly over (65+)
    issues.push({
      title: 'Page title is too long',
      severity: 'low',
      technicalExplanation: `Title is ${title.length} characters (recommended: 50-60)`,
      plainLanguageExplanation: 'Long titles get cut off in search results.',
      suggestedFix: 'Shorten your title to 50-60 characters to ensure it displays fully.',
      evidence: {
        found: title,
        actual: `${title.length} characters`,
        expected: '50-60 characters is optimal (61-65 is acceptable)',
      },
    })
    score -= 5
  } else if (title.length > 60) {
    // 61-65 characters: acceptable but mention it
    issues.push({
      title: 'Page title is slightly longer than recommended',
      severity: 'low',
      technicalExplanation: `Title is ${title.length} characters (slightly over the 50-60 recommendation)`,
      plainLanguageExplanation: 'Your title is slightly longer than the recommended length, but it should still work fine.',
      suggestedFix: 'If possible, shorten your title to 50-60 characters for best results, but this is not urgent.',
      evidence: {
        found: title,
        actual: `${title.length} characters`,
        expected: '50-60 characters is optimal (61-65 is acceptable)',
      },
    })
    score -= 2 // Very minor penalty
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

  // Check H1 tag - filter out hidden, navigation, and boilerplate H1s
  const allH1s = siteData.$('h1')
  const visibleH1s: any[] = []
  const h1Texts: string[] = []
  
  allH1s.each((_, el) => {
    const $el = siteData.$(el)
    const text = $el.text().trim()
    
    // Skip if empty
    if (!text) return
    
    // Skip if hidden via inline styles
    const style = $el.attr('style') || ''
    if (style.includes('display:none') || style.includes('display: none') || 
        style.includes('visibility:hidden') || style.includes('visibility: hidden')) {
      return
    }
    
    // Skip if aria-hidden
    if ($el.attr('aria-hidden') === 'true') {
      return
    }
    
    // Skip if inside navigation (common boilerplate)
    const parent = $el.parent()
    if (parent.is('nav') || parent.closest('nav').length > 0 ||
        parent.is('header') && parent.closest('header').length > 0) {
      // Only skip if it's clearly navigation (has links nearby or is in a nav structure)
      const hasNavLinks = $el.siblings('a').length > 0 || parent.find('a').length > 3
      if (hasNavLinks) {
        return
      }
    }
    
    // Skip screen-reader-only classes (common patterns)
    const classes = $el.attr('class') || ''
    if (classes.includes('sr-only') || classes.includes('visually-hidden') || 
        classes.includes('screen-reader') || classes.includes('sr-only-text')) {
      return
    }
    
    // This is a visible, primary H1
    visibleH1s.push(el)
    h1Texts.push(text)
  })
  
  const h1Count = visibleH1s.length
  
  if (h1Count === 0) {
    const isEnterprise = isEnterpriseSite(siteData)
    issues.push({
      title: isEnterprise 
        ? 'No standard H1 tag detected'
        : 'Missing main heading (H1)',
      severity: isEnterprise ? 'low' : 'high',
      technicalExplanation: 'No H1 tag found',
      plainLanguageExplanation: isEnterprise
        ? 'This page does not appear to use a standard H1 tag. Some large sites use alternative heading strategies (CSS-styled divs, JavaScript-rendered headings, or component-based layouts). If organic traffic is underperforming, consider testing an explicit H1 on important pages.'
        : 'The main heading helps search engines and visitors understand your page topic.',
      suggestedFix: isEnterprise
        ? 'If organic traffic is underperforming, consider testing an explicit H1 on important pages. For enterprise sites, this may be intentional based on your design system.'
        : 'Add one H1 heading at the top of your main content that describes what the page is about.',
      evidence: {
        found: null,
        expected: 'One H1 tag with the main page heading',
      },
    })
    score -= isEnterprise ? 5 : 20 // Reduced penalty for enterprise sites
  } else if (h1Count > 1) {
    // Multiple H1s are acceptable for modern layouts (React components, etc.)
    // Only provide informational note, not a warning
    issues.push({
      title: 'Multiple H1 headings found',
      severity: 'low',
      technicalExplanation: `Found ${h1Count} H1 tags`,
      plainLanguageExplanation: 'Page uses multiple H1s (acceptable for modern layouts). Consider consolidating if targeting SEO landing pages.',
      suggestedFix: 'For SEO-focused pages, use one primary H1 and use H2, H3 for other headings. Multiple H1s are fine for component-based layouts.',
      evidence: {
        found: h1Texts,
        actual: `${h1Count} H1 tags found`,
        expected: '1 H1 tag recommended for SEO landing pages',
        details: { h1Texts },
      },
    })
    score -= 5 // Reduced penalty since multiple H1s are acceptable
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
      suggestedFix: 'Implementation tip: Use responsive (flexible) widths instead of fixed pixel widths.',
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

  // Check for address patterns - strict postal address format
  // Priority 1: Check contact/footer sections first
  const footerText = siteData.$('footer').text() || ''
  const contactSections = siteData.$('[class*="contact"], [id*="contact"], [class*="address"], [id*="address"], [class*="location"], [id*="location"]').text() || ''
  // Also check HTML content blocks and paragraphs (Squarespace and similar CMS often use these)
  const htmlBlocks = siteData.$('[class*="html"], [data-sqsp-text-block-content], p').text() || ''
  // Normalize whitespace (convert all whitespace including newlines to single spaces for easier matching)
  const priorityText = (footerText + ' ' + contactSections + ' ' + htmlBlocks).replace(/\s+/g, ' ').trim()
  
  // Priority 2: Full page text (fallback) - also search raw HTML for addresses that might be missed
  // Normalize whitespace here too
  const textContent = siteData.$('body').text().replace(/\s+/g, ' ')
  // Also search raw HTML (normalized) as fallback for JavaScript-rendered or complex structures
  const rawHtmlNormalized = siteData.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  
  // Strict address pattern: requires street number, optional directional, street word(s), and street type
  // Handles: "1030 N Crooks Rd", "123 Main St", "456 S Park Avenue", "950 N. River Street" (with period)
  // Pattern: \d{1,5}\s+(N|S|E|W|NE|NW|SE|SW\.?\s+)?\w+(\s+\w+)*\s+(St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Cir|Circle|Pl|Place|Pkwy|Parkway)\b
  // Note: Directional is optional, can have period (N. or N), must be followed by space(s)
  const strictStreetPattern = /\d{1,5}\s+(?:(?:N|S|E|W|NE|NW|SE|SW)\.?\s+)?\w+(?:\s+\w+)*\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Cir|Circle|Pl|Place|Pkwy|Parkway)\b/i
  
  // Full address pattern with optional suite/unit, city, state, zip
  // Handles: "1030 N Crooks Rd, Suite G, Clawson, MI 48017" and "950 N. River Street Ypsilanti, MI 48198"
  // Also handles addresses split by <br> tags: "950 N. River Street Ypsilanti, MI 48198" (after whitespace normalization)
  // Pattern: Street (optional: Suite/Unit/Apt) City, State ZIP
  // Note: Comma between street and city is optional to handle formats like "950 N. River Street Ypsilanti, MI 48198"
  // Create street pattern without trailing word boundary to allow matching city immediately after
  const streetPatternNoBoundary = /\d{1,5}\s+(?:(?:N|S|E|W|NE|NW|SE|SW)\.?\s+)?\w+(?:\s+\w+)*\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Cir|Circle|Pl|Place|Pkwy|Parkway)/i
  const fullAddressPattern = new RegExp(
    streetPatternNoBoundary.source +
    '(?:\\s*,?\\s*(?:Suite|Unit|Apt|Apartment|Room|Rm|#)\\s*[A-Z0-9]+)?' + // Optional suite/unit
    '\\s+(?:,?\\s+)?[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*,\\s*[A-Z]{2}\\s+\\d{5}(-\\d{4})?', // City, State ZIP (comma optional after street)
    'i'
  )
  
  // City/State/Zip pattern (for partial address detection)
  const cityStateZipPattern = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}\s+\d{5}(-\d{4})?/i
  
  // Search priority sections first
  let addressMatch: RegExpMatchArray | null = null
  let addressText = 'Not clearly detected'
  
  // Try full address pattern in priority sections
  if (priorityText) {
    addressMatch = priorityText.match(fullAddressPattern)
    if (!addressMatch) {
      // Try street pattern in priority sections, then look for city/state/zip nearby
      const streetMatch = priorityText.match(strictStreetPattern)
      if (streetMatch) {
        // Check if city/state/zip follows within reasonable distance (up to 100 chars - increased for better detection)
        const streetIndex = priorityText.indexOf(streetMatch[0])
        const streetEndIndex = streetIndex + streetMatch[0].length
        const contextAfter = priorityText.substring(streetEndIndex, streetEndIndex + 100)
        const cityStateMatch = contextAfter.match(cityStateZipPattern)
        if (cityStateMatch && cityStateMatch.index !== undefined) {
          // Construct full address: street + city/state/zip
          // Check if there's reasonable spacing between them (not too much text)
          const textBetween = contextAfter.substring(0, cityStateMatch.index).trim()
          // If there's less than 30 chars between street and city (after normalization), they're likely part of same address
          // This handles cases like "Street\nCity" or "Street City" or "Street, City"
          if (textBetween.length < 30) {
            // Construct the full address by combining street + city/state/zip
            const fullAddress = streetMatch[0] + ' ' + cityStateMatch[0]
            // Validate it's a reasonable address length
            if (fullAddress.length >= 20 && fullAddress.length <= 200) {
              // Create a match array manually
              addressMatch = [fullAddress] as RegExpMatchArray
              addressMatch.index = streetIndex
              addressMatch.input = priorityText
            }
          }
        }
      }
    }
  }
  
  // Fallback to full page if nothing found in priority sections
  if (!addressMatch) {
    addressMatch = textContent.match(fullAddressPattern)
    if (!addressMatch) {
      // Try street pattern with city/state validation
      const streetMatch = textContent.match(strictStreetPattern)
      if (streetMatch) {
        const streetIndex = textContent.indexOf(streetMatch[0])
        const streetEndIndex = streetIndex + streetMatch[0].length
        // Look for city/state/zip within 100 chars (normalized text, so this should be enough)
        const contextAfter = textContent.substring(streetEndIndex, streetEndIndex + 100)
        const cityStateMatch = contextAfter.match(cityStateZipPattern)
        if (cityStateMatch && cityStateMatch.index !== undefined) {
          // Construct full address: street + city/state/zip
          // Check if there's reasonable spacing between them (not too much text)
          const textBetween = contextAfter.substring(0, cityStateMatch.index).trim()
          // If there's less than 30 chars between street and city (after normalization), they're likely part of same address
          if (textBetween.length < 30) {
            // Construct the full address by combining street + city/state/zip
            const fullAddress = streetMatch[0] + ' ' + cityStateMatch[0]
            // Validate it's a reasonable address length
            if (fullAddress.length >= 20 && fullAddress.length <= 200) {
              // Create a match array manually
              addressMatch = [fullAddress] as RegExpMatchArray
              addressMatch.index = streetIndex
              addressMatch.input = textContent
            }
          }
        }
      }
    }
  }
  
  // Final fallback: search raw HTML (for cases where cheerio text extraction misses content)
  if (!addressMatch) {
    addressMatch = rawHtmlNormalized.match(fullAddressPattern)
    if (!addressMatch) {
      const streetMatch = rawHtmlNormalized.match(strictStreetPattern)
      if (streetMatch) {
        const streetIndex = rawHtmlNormalized.indexOf(streetMatch[0])
        const streetEndIndex = streetIndex + streetMatch[0].length
        const contextAfter = rawHtmlNormalized.substring(streetEndIndex, streetEndIndex + 100)
        const cityStateMatch = contextAfter.match(cityStateZipPattern)
        if (cityStateMatch && cityStateMatch.index !== undefined) {
          const textBetween = contextAfter.substring(0, cityStateMatch.index).trim()
          if (textBetween.length < 30) {
            const fullAddress = streetMatch[0] + ' ' + cityStateMatch[0]
            if (fullAddress.length >= 20 && fullAddress.length <= 200) {
              addressMatch = [fullAddress] as RegExpMatchArray
              addressMatch.index = streetIndex
              addressMatch.input = rawHtmlNormalized
            }
          }
        }
      }
    }
  }
  
  // Extract address text only if we have a valid full match
  if (addressMatch) {
    const fullMatch = addressMatch[0].trim()
    // Validate it looks like a real address (not random text)
    if (fullMatch.length >= 20 && fullMatch.length <= 200) {
      addressText = fullMatch.substring(0, 100) // Limit to 100 chars
    } else {
      addressText = 'Not clearly detected'
      addressMatch = null // Invalid match
    }
  }
  
  const hasAddress = !!addressMatch

  // Check for phone patterns
  const phonePattern = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/
  const hasPhone = phonePattern.test(textContent)

  // Check for city/state patterns (for partial address detection)
  const cityStatePattern = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}\s+\d{5}(-\d{4})?/i
  const hasCityState = cityStatePattern.test(priorityText) || cityStatePattern.test(textContent)
  
  // Determine address status: full address, partial (city/state only), or none
  const hasPartialAddress = !hasAddress && hasCityState

  if (!hasAddress) {
    if (hasPartialAddress) {
      // Partial address found (city/state but no full street address)
      issues.push({
        title: 'Full street address not found',
        severity: 'high',
        technicalExplanation: 'City and state detected but no complete street address found',
        plainLanguageExplanation: 'We could not detect a full street address with city and postal code. If you serve a local area, add your full address.',
        suggestedFix: 'Add your complete business address (street number, street name, city, state, zip) to your website, preferably in the footer or contact page.',
      })
      score -= 20 // Slightly less penalty since we have partial info
    } else {
      // No address at all
      issues.push({
        title: 'Business address not found',
        severity: 'high',
        technicalExplanation: 'No address pattern detected in page content',
        plainLanguageExplanation: 'Local customers need to find your address easily.',
        suggestedFix: 'Add your complete business address (street, city, state, zip) to your website, preferably in the footer or contact page.',
      })
      score -= 25
    }
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
      suggestedFix: 'Implementation tip: Add structured data (schema markup) with your business name, address, phone, and hours. Research "LocalBusiness schema" for implementation details.',
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

  // Extract found values for evidence
  // Try priority sections first for phone (more likely to be formatted correctly there)
  let phoneMatch = priorityText.match(phonePattern)
  if (!phoneMatch) {
    phoneMatch = textContent.match(phonePattern)
  }
  const emailMatch = textContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  const hoursMatch = textContent.match(/(?:hours?|open|closed|monday|tuesday|wednesday|thursday|friday|saturday|sunday)[\s\S]{0,100}/i)

  return {
    moduleKey: 'local',
    score: Math.max(0, score),
    issues,
    summary,
    evidence: {
      addressFound: hasAddress,
      phoneFound: hasPhone,
      emailFound: !!emailMatch,
      businessHoursFound: !!hoursMatch,
      cityStateFound: hasCityState,
      localSchemaFound: hasLocalSchema,
      googleMapsFound: hasGoogleMaps,
      addressText: addressText, // Already validated and limited above
      phoneText: phoneMatch ? phoneMatch[0] : 'Not found',
      partialAddress: hasPartialAddress, // Indicates city/state found but no full address
    },
  }
}

/**
 * Accessibility Module
 */
export async function runAccessibilityModule(siteData: SiteData): Promise<ModuleResult> {
  const issues: AuditIssue[] = []
  let score = 100

  // Check image alt text
  // Ignore decorative images (alt="") and images with role="presentation"
  const images = siteData.$('img')
  let missingAltCount = 0
  images.each((_, el) => {
    const $el = siteData.$(el)
    const alt = $el.attr('alt')
    const src = $el.attr('src')
    const role = $el.attr('role')
    
    // Skip data URIs and images without src
    if (!src || src.startsWith('data:')) {
      return
    }
    
    // Skip decorative images (alt="" is intentional for decorative images)
    if (alt === '') {
      return
    }
    
    // Skip images with role="presentation" (decorative)
    if (role === 'presentation' || role === 'none') {
      return
    }
    
    // Only count as missing if alt is completely undefined (not present)
    if (alt === undefined) {
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
    ? 'Your site is accessible. Good job making your site usable for everyone! Accessibility improvements can also reduce legal risk (ADA/WCAG compliance) and improve conversion rates.'
    : score >= 60
    ? 'Your site accessibility needs improvement. Focus on adding alt text to images and labels to forms. Improving accessibility reduces legal risk and can increase conversions by making your site usable for more visitors.'
    : 'Your site needs significant accessibility improvements. Start with image descriptions and form labels. Poor accessibility can create legal risk (ADA/WCAG compliance) and reduce conversions by excluding potential customers.'

  const totalImages = images.length
  const imagesWithAlt = totalImages - missingAltCount
  const totalInputs = inputs.length
  const inputsWithLabels = totalInputs - missingLabelCount
  const h1Count = siteData.$('h1').length
  const h2Count = siteData.$('h2').length
  const h3Count = siteData.$('h3').length

  return {
    moduleKey: 'accessibility',
    score: Math.max(0, score),
    issues,
    summary,
    evidence: {
      totalImages,
      imagesWithAlt,
      imagesMissingAlt: missingAltCount,
      totalFormFields: totalInputs,
      formFieldsWithLabels: inputsWithLabels,
      formFieldsMissingLabels: missingLabelCount,
      headingStructure: `H1: ${h1Count}, H2: ${h2Count}, H3: ${h3Count}`,
      headingHierarchyIssues: hierarchyIssues,
      lowContrastElements: lowContrastElements,
    },
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
  // Only flag if resources would actually load over HTTP (not just links)
  if (siteData.url.startsWith('https://')) {
    // Check for actual mixed content (resources that would load, not just links)
    const httpResources = siteData.$('[src^="http://"]').length // Only src attributes, not href
    const httpLinks = siteData.$('[href^="http://"]').length // Separate count for links
    
    // Only flag if there are actual resources (src) that would load over HTTP
    // Links (href) to HTTP sites are less critical
    if (httpResources > 0) {
      issues.push({
        title: 'Some external resources are referenced over HTTP',
        severity: 'low',
        technicalExplanation: `Found ${httpResources} resources with HTTP sources on HTTPS page`,
        plainLanguageExplanation: 'While your page loads securely, some external resources are referenced over HTTP. It is best practice to update all assets to HTTPS where possible.',
        suggestedFix: 'Update all resource URLs (images, scripts, stylesheets) to use HTTPS instead of HTTP where possible.',
        evidence: {
          found: `${httpResources} HTTP resources`,
          actual: `${httpResources} resources using HTTP, ${httpLinks} HTTP links`,
          expected: 'All resources should use HTTPS',
          count: httpResources,
        },
      })
      score -= 5 // Reduced severity - not a vulnerability if page loads securely
    } else if (httpLinks > 0) {
      // Only mention HTTP links as informational, not a security issue
      // Don't create an issue for just links
    }
  }

  // Check for security headers (basic check via meta tags)
  // Note: Real security headers are in HTTP response headers, not HTML
  // This is a placeholder - in production, check actual response headers

  // Collect security evidence
  const securityHeaders: string[] = []
  const missingHeaders: string[] = []
  const commonHeaders = ['strict-transport-security', 'x-frame-options', 'x-content-type-options', 'x-xss-protection', 'content-security-policy']
  
  commonHeaders.forEach(header => {
    if (siteData.headers[header]) {
      securityHeaders.push(header)
    } else {
      missingHeaders.push(header)
    }
  })

  // Adjust summary based on missing headers
  // Don't say "all checks passed" if headers are missing
  const hasMissingHeaders = missingHeaders.length > 0
  const summary = score >= 80
    ? hasMissingHeaders
      ? 'Good, but some optional security enhancements are recommended.'
      : 'Your site security looks good. Make sure HTTPS is enabled and keep it that way.'
    : score >= 60
    ? 'Your site security needs improvement. Enable HTTPS as soon as possible.'
    : 'Your site security needs immediate attention. Enable HTTPS to protect your visitors.'

  // Add low severity issue if headers are missing but score is still good
  if (hasMissingHeaders && score >= 80 && issues.length === 0) {
    issues.push({
      title: 'Some optional security headers are missing',
      severity: 'low',
      technicalExplanation: `Missing headers: ${missingHeaders.join(', ')}`,
      plainLanguageExplanation: 'These security headers provide additional protection but are optional. Your site is still secure.',
      suggestedFix: 'Ask your web developer to add these security headers for enhanced protection.',
      evidence: {
        found: securityHeaders.length > 0 ? securityHeaders.join(', ') : 'None detected',
        actual: `Found: ${securityHeaders.length}, Missing: ${missingHeaders.length}`,
        expected: 'All recommended security headers present',
        details: {
          foundHeaders: securityHeaders,
          missingHeaders: missingHeaders,
        },
      },
    })
    score -= 5 // Small penalty for missing optional headers
  }

  return {
    moduleKey: 'security',
    score: Math.max(0, score),
    issues,
    summary,
    evidence: {
      httpsEnabled: siteData.isHttps || false,
      hasMixedContent: issues.some(i => i.title.toLowerCase().includes('mixed content')),
      securityHeadersFound: securityHeaders.length > 0 ? securityHeaders.join(', ') : 'None detected',
      securityHeadersMissing: missingHeaders.length > 0 ? missingHeaders.join(', ') : 'None',
      totalSecurityHeaders: securityHeaders.length,
      totalMissingHeaders: missingHeaders.length,
    },
  }
}

/**
 * Schema Markup Module
 */
export async function runSchemaModule(siteData: SiteData): Promise<ModuleResult> {
  const issues: AuditIssue[] = []
  let score = 100

  // Check for JSON-LD schema - scan ALL blocks, handle arrays and @graph
  const schemas = siteData.$('script[type="application/ld+json"]')
  let schemaCount = 0
  let hasOrganization = false
  let hasLocalBusiness = false
  const allSchemaTypes: string[] = []

  schemas.each((_, el) => {
    try {
      const jsonText = siteData.$(el).html() || '{}'
      let json = JSON.parse(jsonText)
      
      // Handle arrays of schemas
      if (Array.isArray(json)) {
        json.forEach((item: any) => {
          schemaCount++
          if (item['@type']) {
            allSchemaTypes.push(item['@type'])
            if (item['@type'] === 'Organization' || item['@type'] === 'LocalBusiness') {
              hasOrganization = true
              if (item['@type'] === 'LocalBusiness') {
                hasLocalBusiness = true
              }
            }
          }
        })
      } 
      // Handle @graph (schema.org pattern)
      else if (json['@graph'] && Array.isArray(json['@graph'])) {
        json['@graph'].forEach((item: any) => {
          schemaCount++
          if (item['@type']) {
            allSchemaTypes.push(item['@type'])
            if (item['@type'] === 'Organization' || item['@type'] === 'LocalBusiness') {
              hasOrganization = true
              if (item['@type'] === 'LocalBusiness') {
                hasLocalBusiness = true
              }
            }
          }
        })
      }
      // Handle single schema object
      else {
        schemaCount++
        if (json['@type']) {
          allSchemaTypes.push(json['@type'])
          if (json['@type'] === 'Organization' || json['@type'] === 'LocalBusiness') {
            hasOrganization = true
            if (json['@type'] === 'LocalBusiness') {
              hasLocalBusiness = true
            }
          }
        }
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  })

  // Detect site type to apply appropriate schema validation
  const siteType = detectSiteType(siteData)
  
  if (schemaCount === 0) {
    // Check if this is clearly a local/business site that should have schema
    const hasBusinessIndicators = siteType === 'local_business' || 
      (siteData.$('body').text().match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/) && // Phone
       siteData.$('body').text().match(/\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd)/i)) // Address
    
    // Cap the deduction and use softer wording when we can't detect JS-injected schema
    const severity = hasBusinessIndicators ? 'medium' : 'low'
    const deduction = hasBusinessIndicators ? 20 : 10 // Reduced from 30
    
    issues.push({
      title: 'No structured data detected in HTML',
      severity,
      technicalExplanation: 'No JSON-LD schema markup detected in static HTML. Important: This analysis checks the HTML source only. If your site injects structured data via JavaScript, it may not appear here.',
      plainLanguageExplanation: hasBusinessIndicators
        ? 'No structured data (schema.org) was detected in the HTML we analyzed. Search engines may have fewer explicit signals for rich results and enhanced snippets.'
        : 'No structured data (schema.org) was detected in the HTML we analyzed. This may be because your site uses JavaScript to inject schema, which requires browser rendering to detect.',
      suggestedFix: 'Add JSON-LD schema for your main content type (e.g., Organization, Product, Article) directly in the HTML using <script type="application/ld+json">, not only via JavaScript. For most sites, we recommend adding schema directly in the HTML.',
    })
    score = Math.max(70, score - deduction) // Cap at 70 minimum
  } else {
    // Validate schema based on site type
    if (siteType === 'publisher') {
      // Publishers should have NewsArticle, Article, or Publisher schema
      const hasNewsArticle = allSchemaTypes.some(type => 
        type === 'NewsArticle' || type === 'Article' || type === 'BlogPosting' || type === 'Publisher'
      )
      if (!hasNewsArticle && !hasOrganization) {
        issues.push({
          title: 'Consider adding publisher-specific schema',
          severity: 'low',
          technicalExplanation: 'Publisher site detected but no NewsArticle/Article/Publisher schema found',
          plainLanguageExplanation: 'News publishers benefit from NewsArticle or Publisher schema markup for better search visibility.',
          suggestedFix: 'Add NewsArticle schema for individual articles and Publisher schema for your organization.',
        })
        score -= 5 // Low severity - not required but recommended
      }
    } else if (siteType === 'local_business') {
      // Local businesses should have LocalBusiness schema
      if (!hasLocalBusiness && !hasOrganization) {
        issues.push({
          title: 'Missing business organization schema',
          severity: 'medium',
          technicalExplanation: 'Local business detected but no LocalBusiness or Organization schema found',
          plainLanguageExplanation: 'Local business schema helps Google show your business information in local search results.',
          suggestedFix: 'Add LocalBusiness or Organization schema with your business name, address, phone, and website.',
        })
        score -= 20
      }
    } else {
      // For other site types, Organization is recommended but not required
      if (!hasOrganization && !hasLocalBusiness && schemaCount > 0) {
        // Only flag if they have schema but wrong type
        issues.push({
          title: 'Consider adding Organization schema',
          severity: 'low',
          technicalExplanation: 'Schema found but not Organization or LocalBusiness type',
          plainLanguageExplanation: 'Organization schema helps Google show your business information in search results.',
          suggestedFix: 'Add Organization schema with your business name and website.',
        })
        score -= 5 // Low severity - informational
      }
    }
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

  // Collect schema evidence - use allSchemaTypes we already collected
  const schemaSnippets: string[] = []
  
  schemas.each((_, el) => {
    try {
      const jsonText = siteData.$(el).html()
      if (jsonText) {
        schemaSnippets.push(jsonText.substring(0, 200))
      }
    } catch {
      // Invalid JSON, skip
    }
  })

  return {
    moduleKey: 'schema',
    score: Math.max(0, score),
    issues,
    summary,
    evidence: {
      schemaFound: schemas.length > 0,
      schemaCount: schemas.length,
      schemaTypes: allSchemaTypes.length > 0 ? allSchemaTypes.join(', ') : 'None detected',
      schemaPreview: schemaSnippets.length > 0 ? schemaSnippets[0] + '...' : 'No schema markup found',
    },
  }
}

/**
 * Social Metadata Module
 */
export async function runSocialModule(siteData: SiteData): Promise<ModuleResult> {
  const issues: AuditIssue[] = []
  let score = 100

  // Check Open Graph tags
  // Note: Static HTML parsing may not detect tags injected via JavaScript
  const ogTitle = siteData.$('meta[property="og:title"]').attr('content')
  const ogDescription = siteData.$('meta[property="og:description"]').attr('content')
  const ogImage = siteData.$('meta[property="og:image"]').attr('content')
  const ogUrl = siteData.$('meta[property="og:url"]').attr('content')
  const ogImageWidth = siteData.$('meta[property="og:image:width"]').attr('content')
  const ogImageHeight = siteData.$('meta[property="og:image:height"]').attr('content')
  const pageTitle = siteData.title || ''

  // Compare OG title with page title
  if (ogTitle && pageTitle) {
    const titleSimilarity = ogTitle.toLowerCase().trim() === pageTitle.toLowerCase().trim()
    if (!titleSimilarity && ogTitle.length > 0 && pageTitle.length > 0) {
      // Titles differ - this is often intentional but worth noting
      // Don't create an issue, just note in evidence
    }
  }

  if (!ogTitle) {
    issues.push({
      title: 'Open Graph title not detected in static HTML',
      severity: 'low',
      technicalExplanation: 'No og:title meta tag found in static HTML (may be injected via JavaScript)',
      plainLanguageExplanation: 'Open Graph tags were not detected in the static HTML. If your site uses JavaScript to inject these tags, they may still be present but not detected by this analysis.',
      suggestedFix: 'Ensure og:title is present in the HTML source. For dynamic sites, verify tags are rendered before page load or use server-side rendering.',
    })
    score -= 5 // Reduced severity since it may be dynamically injected
  }

  if (!ogDescription) {
    issues.push({
      title: 'Open Graph description not detected in static HTML',
      severity: 'low',
      technicalExplanation: 'No og:description meta tag found in static HTML (may be injected via JavaScript)',
      plainLanguageExplanation: 'Open Graph tags were not detected in the static HTML. If your site uses JavaScript to inject these tags, they may still be present but not detected by this analysis.',
      suggestedFix: 'Ensure og:description is present in the HTML source. For dynamic sites, verify tags are rendered before page load or use server-side rendering.',
    })
    score -= 5 // Reduced severity
  }

  // Check for multiple OG images
  const ogImages = siteData.$('meta[property="og:image"]')
  const ogImageCount = ogImages.length
  
  if (!ogImage) {
    issues.push({
      title: 'Open Graph image not detected in static HTML',
      severity: 'medium', // Upgraded from low - missing OG image is high impact
      technicalExplanation: 'No og:image meta tag found in static HTML (may be injected via JavaScript)',
      plainLanguageExplanation: 'An Open Graph image makes your shared links stand out on social platforms. Without one, your links will appear plain and less engaging.',
      suggestedFix: 'Add an og:image meta tag with a high-quality image (at least 1200x630 pixels). Ensure it\'s present in the HTML source, not only injected via JavaScript.',
    })
    score -= 10 // Increased from 3 - missing OG image is more important
  } else if (ogImageCount > 1) {
    issues.push({
      title: 'Multiple Open Graph images detected',
      severity: 'low',
      technicalExplanation: `Found ${ogImageCount} og:image tags`,
      plainLanguageExplanation: 'Multiple social images were found. Most platforms use the first one, so make sure the primary image appears first and is high quality.',
      suggestedFix: 'Ensure your primary, highest-quality image is the first og:image tag. Remove or consolidate duplicate image tags.',
    })
    score -= 2
  } else {
      // Validate OG image dimensions if provided
      if (ogImageWidth && ogImageHeight) {
        const width = parseInt(ogImageWidth, 10)
        const height = parseInt(ogImageHeight, 10)
        // Recommended: 1200x630 for optimal social sharing
        if (width < 600 || height < 315) {
          issues.push({
            title: 'Open Graph image dimensions are too small',
            severity: 'medium', // Upgraded from low
            technicalExplanation: `OG image dimensions: ${width}x${height} (recommended: 1200x630)`,
            plainLanguageExplanation: 'Your social image may appear low-quality or cropped on modern platforms. Aim for at least 1200×630 pixels and under 5 MB.',
            suggestedFix: 'Use an image that is at least 1200x630 pixels (and under 5 MB) for optimal social sharing display.',
            evidence: {
              found: `${width}x${height}`,
              actual: `Image dimensions: ${width}x${height}`,
              expected: '1200x630 pixels (or larger, under 5 MB)',
            },
          })
          score -= 5 // Increased from 2
        }
      } else {
        // Image URL found but dimensions not specified
        // Note in evidence but don't create issue
      }
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

  // Collect social metadata evidence (variables already defined above)
  const ogType = siteData.$('meta[property="og:type"]').attr('content')
  
  // Note: For sites that inject OG tags via JavaScript (React, Vue, etc.),
  // static HTML parsing may not detect them. This is a known limitation
  // of static analysis. Browser rendering would be required for full detection.

  return {
    moduleKey: 'social',
    score: Math.max(0, score),
    issues,
    summary,
    evidence: {
      ogTitle: ogTitle || 'Not found',
      ogDescription: ogDescription || 'Not found',
      ogImage: ogImage || 'Not found',
      ogType: ogType || 'Not found',
      ogUrl: ogUrl || 'Not found',
      twitterCard: twitterCard || 'Not found',
      twitterTitle: twitterTitle || 'Not found',
      twitterDescription: twitterDescription || 'Not found',
      twitterImage: twitterImage || 'Not found',
      note: 'Note: Dynamic sites that inject meta tags via JavaScript may not be fully detected by static analysis.',
    },
  }
}

/**
 * Crawl Health Module
 */
export async function runCrawlHealthModule(siteData: SiteData): Promise<ModuleResult> {
  const issues: AuditIssue[] = []
  let score = 100

  // Check for sitemap - first check robots.txt, then default locations
  let sitemapExists = false
  let sitemapUrl: string | null = null
  
  // First, check robots.txt for sitemap declaration
  try {
    const robotsUrl = new URL('/robots.txt', siteData.url).toString()
    const robotsController = new AbortController()
    const robotsTimeout = setTimeout(() => robotsController.abort(), 5000)
    const robotsResponse = await fetch(robotsUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO CheckSite/1.0)' },
      signal: robotsController.signal,
    })
    clearTimeout(robotsTimeout)
    
    if (robotsResponse.ok) {
      const robotsContent = await robotsResponse.text()
      // Look for sitemap declaration in robots.txt (case-insensitive)
      const sitemapMatch = robotsContent.match(/sitemap:\s*(.+)/i)
      if (sitemapMatch) {
        const declaredSitemap = sitemapMatch[1].trim()
        // Handle absolute and relative URLs
        try {
          if (declaredSitemap.startsWith('http://') || declaredSitemap.startsWith('https://')) {
            sitemapUrl = declaredSitemap
          } else {
            sitemapUrl = new URL(declaredSitemap, siteData.url).toString()
          }
        } catch {
          // Invalid URL in robots.txt, will check default location
        }
      }
    }
  } catch {
    // robots.txt not accessible, will check default location
  }
  
  // If no sitemap found in robots.txt, check default locations
  if (!sitemapUrl) {
    sitemapUrl = new URL('/sitemap.xml', siteData.url).toString()
  }
  
  // Try to fetch the sitemap
  try {
    const sitemapController = new AbortController()
    const sitemapTimeout = setTimeout(() => sitemapController.abort(), 5000)
    const sitemapResponse = await fetch(sitemapUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO CheckSite/1.0)' },
      signal: sitemapController.signal,
    })
    clearTimeout(sitemapTimeout)
    
    if (sitemapResponse.ok) {
      sitemapExists = true
    } else {
      // If default failed, also try sitemap_index.xml
      if (sitemapUrl.endsWith('/sitemap.xml')) {
        try {
          const sitemapIndexUrl = new URL('/sitemap_index.xml', siteData.url).toString()
          const indexController = new AbortController()
          const indexTimeout = setTimeout(() => indexController.abort(), 5000)
          const indexResponse = await fetch(sitemapIndexUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO CheckSite/1.0)' },
            signal: indexController.signal,
          })
          clearTimeout(indexTimeout)
          if (indexResponse.ok) {
            sitemapExists = true
            sitemapUrl = sitemapIndexUrl
          }
        } catch {
          // sitemap_index.xml also failed
        }
      }
    }
  } catch (error) {
    // Sitemap fetch failed
  }
  
  if (!sitemapExists) {
    issues.push({
      title: 'Sitemap file not found',
      severity: 'high',
      technicalExplanation: 'sitemap.xml not accessible at default location or location declared in robots.txt',
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
      // Parse robots.txt properly to check if it actually blocks search engines
      // Only flag if Googlebot or * is explicitly blocked from /
      const lines = robotsContent.split('\n').map(line => line.trim())
      let currentUserAgent: string | null = null
      let isBlocking = false
      let hasAllowRoot = false
      
      for (const line of lines) {
        // Skip comments and empty lines
        if (!line || line.startsWith('#')) continue
        
        // Check for User-agent directive
        const userAgentMatch = line.match(/^user-agent:\s*(.+)$/i)
        if (userAgentMatch) {
          currentUserAgent = userAgentMatch[1].toLowerCase()
          hasAllowRoot = false // Reset when new user-agent section starts
          continue
        }
        
        // Check for Allow directive (takes precedence over Disallow)
        const allowMatch = line.match(/^allow:\s*(.+)$/i)
        if (allowMatch && currentUserAgent) {
          const allowPath = allowMatch[1].trim()
          if (allowPath === '/' || allowPath === '') {
            hasAllowRoot = true
          }
          continue
        }
        
        // Check for Disallow directive
        const disallowMatch = line.match(/^disallow:\s*(.+)$/i)
        if (disallowMatch && currentUserAgent) {
          const disallowPath = disallowMatch[1].trim()
          // Only flag if:
          // 1. It blocks the root path (/)
          // 2. For Googlebot or * (all bots)
          // 3. AND there's no Allow: / that overrides it
          if (disallowPath === '/' && 
              (currentUserAgent === '*' || currentUserAgent.includes('googlebot')) &&
              !hasAllowRoot) {
            isBlocking = true
            break
          }
        }
      }
      
      if (isBlocking) {
        // Parse robots.txt to create interpretive summary
        const disallowedPaths: string[] = []
        const allowedPaths: string[] = []
        const sitemapLinks: string[] = []
        let crawlAllowed = true
        
        const parseLines = robotsContent.split('\n').map(line => line.trim())
        let currentUA: string | null = null
        for (const line of parseLines) {
          if (!line || line.startsWith('#')) continue
          const uaMatch = line.match(/^user-agent:\s*(.+)$/i)
          if (uaMatch) {
            currentUA = uaMatch[1].toLowerCase()
            continue
          }
          const disallowMatch = line.match(/^disallow:\s*(.+)$/i)
          if (disallowMatch && currentUA && (currentUA === '*' || currentUA.includes('google'))) {
            const path = disallowMatch[1].trim()
            if (path === '/') {
              crawlAllowed = false
            } else if (path) {
              disallowedPaths.push(path)
            }
          }
          const allowMatch = line.match(/^allow:\s*(.+)$/i)
          if (allowMatch && currentUA && (currentUA === '*' || currentUA.includes('google'))) {
            const path = allowMatch[1].trim()
            if (path && path !== '/') {
              allowedPaths.push(path)
            }
          }
          const sitemapMatch = line.match(/^sitemap:\s*(.+)$/i)
          if (sitemapMatch) {
            sitemapLinks.push(sitemapMatch[1].trim())
          }
        }
        
        issues.push({
          title: 'Robots.txt is blocking search engines',
          severity: 'high',
          technicalExplanation: 'robots.txt contains "Disallow: /" which blocks all pages',
          plainLanguageExplanation: 'Your robots.txt file is preventing search engines from finding your pages.',
          suggestedFix: 'Remove "Disallow: /" from your robots.txt file to allow search engines to crawl your site.',
          evidence: {
            found: crawlAllowed ? '✅ Crawl allowed' : '❌ Crawl blocked',
            actual: crawlAllowed 
              ? `Crawl allowed. Disallowed paths: ${disallowedPaths.length > 0 ? disallowedPaths.slice(0, 3).join(', ') : 'None'}. Sitemaps: ${sitemapLinks.length}`
              : '❌ Critical: All pages blocked from crawling',
            expected: 'Should allow search engines to crawl pages',
            details: {
              crawlAllowed,
              disallowedPaths: disallowedPaths.slice(0, 5),
              allowedPaths: allowedPaths.slice(0, 5),
              sitemapCount: sitemapLinks.length,
            },
          },
        })
        score -= 30
      } else {
        // Even if not blocking, provide interpretive summary
        const disallowedPaths: string[] = []
        const sitemapLinks: string[] = []
        const parseLines = robotsContent.split('\n').map(line => line.trim())
        let currentUA: string | null = null
        for (const line of parseLines) {
          if (!line || line.startsWith('#')) continue
          const uaMatch = line.match(/^user-agent:\s*(.+)$/i)
          if (uaMatch) {
            currentUA = uaMatch[1].toLowerCase()
            continue
          }
          const disallowMatch = line.match(/^disallow:\s*(.+)$/i)
          if (disallowMatch && currentUA && (currentUA === '*' || currentUA.includes('google'))) {
            const path = disallowMatch[1].trim()
            if (path && path !== '/') {
              disallowedPaths.push(path)
            }
          }
          const sitemapMatch = line.match(/^sitemap:\s*(.+)$/i)
          if (sitemapMatch) {
            sitemapLinks.push(sitemapMatch[1].trim())
          }
        }
        
        // Store interpretive summary in evidence (not as issue)
        // This will be shown in the evidence table
      }
      // If robots.txt exists and doesn't block, it's good - no issue needed
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
  
  // Collect module-level evidence with interpretive robots.txt summary
  let robotsSummary: any = { found: false, crawlAllowed: null, disallowedPaths: [], sitemapCount: 0, sitemapUrls: [], hasNormalBlocking: false }
  try {
    const robotsUrl = new URL('/robots.txt', siteData.url).toString()
    const robotsResponse = await fetch(robotsUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO CheckSite/1.0)' },
    })
    if (robotsResponse.ok) {
      const robotsContent = await robotsResponse.text()
      robotsSummary.found = true
      
      // Parse for summary
      const disallowedPaths: string[] = []
      const sitemapLinks: string[] = []
      let crawlBlocked = false
      const parseLines = robotsContent.split('\n').map(line => line.trim())
      let currentUA: string | null = null
      
      for (const line of parseLines) {
        if (!line || line.startsWith('#')) continue
        const uaMatch = line.match(/^user-agent:\s*(.+)$/i)
        if (uaMatch) {
          currentUA = uaMatch[1].toLowerCase()
          continue
        }
        const disallowMatch = line.match(/^disallow:\s*(.+)$/i)
        if (disallowMatch && currentUA && (currentUA === '*' || currentUA.includes('google'))) {
          const path = disallowMatch[1].trim()
          if (path === '/') {
            crawlBlocked = true
          } else if (path) {
            disallowedPaths.push(path)
          }
        }
        const sitemapMatch = line.match(/^sitemap:\s*(.+)$/i)
        if (sitemapMatch) {
          sitemapLinks.push(sitemapMatch[1].trim())
        }
      }
      
      robotsSummary.crawlAllowed = !crawlBlocked
      robotsSummary.disallowedPaths = disallowedPaths.slice(0, 5)
      robotsSummary.sitemapCount = sitemapLinks.length
      robotsSummary.sitemapUrls = sitemapLinks.slice(0, 3)
      
      // Check if disallowed paths are normal utility paths
      const normalPaths = ['/wp-admin', '/cart', '/checkout', '/search', '/admin', '/login', '/private', '/api']
      robotsSummary.hasNormalBlocking = disallowedPaths.some(path => 
        normalPaths.some(normal => path.toLowerCase().includes(normal.toLowerCase()))
      )
    }
  } catch {
    // robots.txt not accessible
  }
  
  // Build sitemap summary
  let sitemapSummary = ''
  if (robotsSummary.found && robotsSummary.sitemapCount > 0) {
    sitemapSummary = `Sitemaps detected: ${robotsSummary.sitemapUrls?.join(', ') || `${robotsSummary.sitemapCount} found`}`
  }
  
  // Build robots interpretation
  let robotsInterpretation = ''
  if (robotsSummary.found) {
    if (!robotsSummary.crawlAllowed) {
      robotsInterpretation = '❌ Critical: Your robots.txt blocks all crawling for all search engines (Disallow: / for User-agent: *). This will prevent your site from being indexed normally.'
    } else if (robotsSummary.disallowedPaths.length > 0) {
      if (robotsSummary.hasNormalBlocking) {
        robotsInterpretation = `✅ Normal: Common utility paths are disallowed from crawling (${robotsSummary.disallowedPaths.slice(0, 3).join(', ')}). This is typical and not a problem.`
      } else {
        robotsInterpretation = `⚠️ ${robotsSummary.disallowedPaths.length} disallowed paths detected. Review to ensure important pages aren't blocked.`
      }
    } else {
      robotsInterpretation = '✅ Crawl allowed - no restrictions detected'
    }
  }
  
  return {
    moduleKey: 'crawl_health',
    score: Math.max(0, score),
    issues,
    summary,
    evidence: {
      robotsTxtFound: robotsSummary.found,
      robotsTxtSummary: robotsSummary.found 
        ? `${robotsSummary.crawlAllowed ? '✅ Crawl allowed' : '❌ Crawl blocked'}${robotsSummary.disallowedPaths.length > 0 ? ` | ${robotsSummary.disallowedPaths.length} disallowed paths` : ''}${robotsSummary.sitemapCount > 0 ? ` | ✅ ${robotsSummary.sitemapCount} sitemap(s)` : ''}`
        : 'Not accessible',
      robotsTxtInterpretation: robotsInterpretation,
      sitemapSummary: sitemapSummary,
      internalLinksCount: internalLinks,
      totalLinksChecked: linkUrls.length > 0 ? Math.min(10, linkUrls.length) : 0,
      brokenLinksCount: brokenLinks.length,
      sitemapExists: sitemapExists,
      sitemapUrl: sitemapExists ? sitemapUrl : null,
    },
  }
}

/**
 * Competitor Overview Module
 * Uses provided competitor URL to fetch and compare their data
 */
export async function runCompetitorOverviewModule(
  siteData: SiteData,
  providedCompetitorUrl?: string | null
): Promise<ModuleResult> {
  const issues: AuditIssue[] = []
  let score = 75 // Default score

  // Extract site information
  const title = siteData.$('title').text().trim() || ''
  const metaDescription = siteData.$('meta[name="description"]').attr('content') || ''
  const bodyTextContent = siteData.$('body').text().trim()
  const wordCount = bodyTextContent.split(/\s+/).filter(w => w.length > 0).length

  let competitorUrl: string | null = null
  let competitorReason: string = 'No competitor URL provided'
  let competitorData: {
    title?: string
    description?: string
    h1?: string
    wordCount?: number
  } | null = null

  // Use provided competitor URL
  if (providedCompetitorUrl && providedCompetitorUrl.trim()) {
    competitorUrl = providedCompetitorUrl.trim()
    competitorReason = `Using provided competitor URL: ${competitorUrl}`
    console.log(`[runCompetitorOverviewModule] Using provided competitor URL: ${competitorUrl}`)
    
    // Normalize URL
    try {
      if (!competitorUrl.startsWith('http://') && !competitorUrl.startsWith('https://')) {
        competitorUrl = `https://${competitorUrl}`
      }
      // Validate URL format
      new URL(competitorUrl)
    } catch (urlError) {
      console.error(`[runCompetitorOverviewModule] Invalid competitor URL format: ${competitorUrl}`, urlError)
      competitorUrl = null
      competitorReason = `Entered URL not available: Invalid URL format. Please check the URL and try again.`
    }
  } else {
    console.log('[runCompetitorOverviewModule] No competitor URL provided')
    competitorReason = 'No competitor URL was provided for comparison.'
  }

  // Fetch competitor's website data if URL is valid
  if (competitorUrl) {
    try {
      const competitorController = new AbortController()
      const competitorTimeout = setTimeout(() => competitorController.abort(), 10000) // 10 second timeout
      
      // Use more realistic browser headers to avoid bot detection and 403 errors
      const competitorResponse = await fetch(competitorUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
        },
        signal: competitorController.signal,
        redirect: 'follow',
      })
      clearTimeout(competitorTimeout)

      if (competitorResponse.ok) {
        const competitorHtml = await competitorResponse.text()
        const cheerio = await import('cheerio')
        const competitor$ = cheerio.load(competitorHtml)
        
        competitorData = {
          title: competitor$('title').text().trim() || 'Not found',
          description: competitor$('meta[name="description"]').attr('content') || 'Not found',
          h1: competitor$('h1').first().text().trim() || 'Not found',
          wordCount: competitor$('body').text().trim().split(/\s+/).filter((w: string) => w.length > 0).length,
        }
        
        console.log('[runCompetitorOverviewModule] ✅ Successfully fetched competitor data')
        competitorReason = `Successfully analyzed competitor: ${competitorUrl}`
      } else {
        console.warn(`[runCompetitorOverviewModule] Failed to fetch competitor: ${competitorResponse.status}`)
        competitorReason = `Entered URL not available: The URL returned status ${competitorResponse.status}. Please check the URL and try again.`
        competitorUrl = null // Mark as unavailable
      }
    } catch (fetchError) {
      console.warn(`[runCompetitorOverviewModule] Error fetching competitor data:`, fetchError)
      const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError)
      
      // Try to provide helpful error message
      if (errorMsg.includes('timeout') || errorMsg.includes('aborted')) {
        competitorReason = `Entered URL not available: The URL took too long to respond. Please check the URL and try again.`
      } else if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('getaddrinfo')) {
        competitorReason = `Entered URL not available: The domain could not be found. Please check the URL and try again.`
      } else if (errorMsg.includes('ECONNREFUSED')) {
        competitorReason = `Entered URL not available: Connection refused. Please check the URL and try again.`
      } else {
        competitorReason = `Entered URL not available: ${errorMsg}. Please check the URL and try again.`
      }
      
      competitorUrl = null // Mark as unavailable
    }
  }

  // Compare with competitor if we have data
  if (competitorData && competitorUrl) {
    // Compare word count - provide specific, actionable insights
    if (competitorData.wordCount && wordCount < competitorData.wordCount) {
      const difference = competitorData.wordCount - wordCount
      const percentageDiff = Math.round((difference / competitorData.wordCount) * 100)
      issues.push({
        title: `Your site has ${percentageDiff}% less content than your competitor`,
        severity: difference > 500 ? 'medium' : 'low',
        technicalExplanation: `Your site: ${wordCount} words, Competitor: ${competitorData.wordCount} words (${difference} word difference)`,
        plainLanguageExplanation: `Your competitor's homepage has ${competitorData.wordCount.toLocaleString()} words compared to your ${wordCount.toLocaleString()} words. More detailed, helpful content typically ranks better in search results.`,
        suggestedFix: `Add ${difference.toLocaleString()} more words of helpful content to your homepage. Consider adding: detailed service descriptions, customer testimonials, FAQs, or helpful guides that your target audience would find valuable.`,
        evidence: {
          found: `${wordCount.toLocaleString()} words on your site`,
          actual: `${wordCount.toLocaleString()} words`,
          expected: `${competitorData.wordCount.toLocaleString()} words (to match competitor)`,
          details: {
            yourWordCount: wordCount,
            competitorWordCount: competitorData.wordCount,
            difference: difference,
            percentageDifference: percentageDiff,
          },
        },
      })
      score -= difference > 500 ? 15 : 5
    }

    // Compare title length and quality
    if (competitorData.title && title) {
      const yourTitleLength = title.length
      const competitorTitleLength = competitorData.title.length
      const optimalRange = yourTitleLength >= 50 && yourTitleLength <= 60
      const competitorOptimal = competitorTitleLength >= 50 && competitorTitleLength <= 60
      
      if (!optimalRange && competitorOptimal) {
        issues.push({
          title: 'Your page title length is not optimized compared to your competitor',
          severity: yourTitleLength > 65 || yourTitleLength < 30 ? 'medium' : 'low',
          technicalExplanation: `Your title: ${yourTitleLength} chars, Competitor: ${competitorTitleLength} chars (optimal: 50-60)`,
          plainLanguageExplanation: `Your competitor's title is ${competitorTitleLength} characters (within the optimal 50-60 character range), while yours is ${yourTitleLength} characters. Titles in the optimal range display fully in search results.`,
          suggestedFix: `Shorten your title to 50-60 characters to match your competitor's optimization. Your competitor's title: "${competitorData.title.substring(0, 60)}${competitorData.title.length > 60 ? '...' : ''}"`,
          evidence: {
            found: title,
            actual: `${yourTitleLength} characters`,
            expected: `50-60 characters (competitor has ${competitorTitleLength} characters)`,
            details: {
              competitorTitle: competitorData.title,
            },
          },
        })
        score -= yourTitleLength > 65 || yourTitleLength < 30 ? 10 : 5
      }
    }

    // Compare meta descriptions
    if (competitorData.description && metaDescription) {
      const yourDescLength = metaDescription.length
      const competitorDescLength = competitorData.description.length
      const optimalRange = yourDescLength >= 120 && yourDescLength <= 160
      const competitorOptimal = competitorDescLength >= 120 && competitorDescLength <= 160
      
      if (!optimalRange && competitorOptimal) {
        issues.push({
          title: 'Your meta description length differs from your competitor',
          severity: 'low',
          technicalExplanation: `Your description: ${yourDescLength} chars, Competitor: ${competitorDescLength} chars (optimal: 120-160)`,
          plainLanguageExplanation: `Your competitor's description is ${competitorDescLength} characters (within the optimal 120-160 character range), while yours is ${yourDescLength} characters. Optimal descriptions display fully in search results.`,
          suggestedFix: `Adjust your meta description to 120-160 characters. Your competitor's description: "${competitorData.description.substring(0, 100)}${competitorData.description.length > 100 ? '...' : ''}"`,
          evidence: {
            found: metaDescription,
            actual: `${yourDescLength} characters`,
            expected: `120-160 characters (competitor has ${competitorDescLength} characters)`,
            details: {
              competitorDescription: competitorData.description,
            },
          },
        })
        score -= 5
      }
    }

    // Compare H1 headings
    const h1Text = siteData.$('h1').first().text().trim()
    if (competitorData.h1 && h1Text && competitorData.h1 !== 'Not found') {
      const yourH1Length = h1Text.length
      const competitorH1Length = competitorData.h1.length
      
      if (yourH1Length < 10 || yourH1Length > 60) {
        issues.push({
          title: 'Your main heading (H1) could be more descriptive like your competitor',
          severity: 'low',
          technicalExplanation: `Your H1: ${yourH1Length} chars, Competitor: ${competitorH1Length} chars`,
          plainLanguageExplanation: `Your competitor's main heading is more descriptive (${competitorH1Length} characters) compared to yours (${yourH1Length} characters). Descriptive headings help both visitors and search engines understand your page content.`,
          suggestedFix: `Make your H1 more descriptive. Your competitor's H1: "${competitorData.h1}"`,
          evidence: {
            found: h1Text,
            actual: `${yourH1Length} characters`,
            expected: `10-60 characters (competitor has ${competitorH1Length} characters)`,
            details: {
              competitorH1: competitorData.h1,
            },
          },
        })
        score -= 5
      }
    }
  } else {
    // Generic competitor insights if no competitor URL provided or URL failed
    if (!providedCompetitorUrl) {
      // No URL was provided
      issues.push({
        title: 'No competitor URL provided',
        severity: 'low',
        technicalExplanation: 'Competitor analysis requires a competitor URL',
        plainLanguageExplanation: 'To compare your site with a competitor, you need to provide a competitor website URL.',
        suggestedFix: 'Enter a competitor website URL when selecting Competitor Overview to get specific comparison insights.',
      })
    } else {
      // URL was provided but failed
      issues.push({
        title: 'Competitor URL not available',
        severity: 'low',
        technicalExplanation: competitorReason,
        plainLanguageExplanation: 'We could not access the competitor URL you provided. This section provides general best practices instead.',
        suggestedFix: 'Please check the competitor URL and ensure it is accessible. You can try again with a different URL.',
      })
    }
  }

  // Check if site has unique content (heuristic)
  if (wordCount < 500) {
    issues.push({
      title: 'Your site may need more content than competitors',
      severity: 'medium',
      technicalExplanation: `Site has only ${wordCount} words`,
      plainLanguageExplanation: 'Competitors with more detailed content often rank better in search results.',
      suggestedFix: 'Add more helpful content to your pages. Aim for at least 500-1000 words per main page with useful information about your business.',
      evidence: {
        found: `${wordCount} words`,
        actual: `${wordCount} words`,
        expected: 'At least 500-1000 words per main page',
        details: {
          yourWordCount: wordCount,
        },
      },
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
  
  // Build evidence object
  const evidence: any = {
    yourSiteWordCount: wordCount,
    competitorIdentified: !!competitorUrl,
    competitorUrl: competitorUrl || 'Not identified',
    competitorReason: competitorReason,
  }

  if (competitorData) {
    evidence.competitorTitle = competitorData.title
    evidence.competitorDescription = competitorData.description
    evidence.competitorH1 = competitorData.h1
    evidence.competitorWordCount = competitorData.wordCount
    evidence.comparisonAvailable = true
  } else {
    evidence.competitorTitle = 'N/A - Competitor data not available'
    evidence.competitorDescription = 'N/A - Competitor data not available'
    evidence.competitorH1 = 'N/A - Competitor data not available'
    evidence.competitorWordCount = 'N/A'
    evidence.comparisonAvailable = false
    // User-friendly message instead of technical error
    if (providedCompetitorUrl && !competitorUrl) {
      // URL was provided but failed
      evidence.note = competitorReason || 'Entered URL not available. Please check the URL and try again.'
    } else if (!providedCompetitorUrl) {
      // No URL was provided
      evidence.note = 'No competitor URL was provided for comparison.'
    } else {
      // Should not reach here, but fallback
      evidence.note = 'We could not access the competitor URL, so this section gives general best practices instead.'
    }
  }
  
  return {
    moduleKey: 'competitor_overview',
    score: Math.max(0, score),
    issues,
    summary,
    evidence,
  }
}

/**
 * Run all enabled modules
 */
export async function runAuditModules(
  url: string,
  enabledModules: ModuleKey[],
  competitorUrl?: string | null
): Promise<{ results: ModuleResult[]; siteData: SiteData }> {
  const siteData = await fetchSite(url)
  const results: ModuleResult[] = []

  // Type-safe module map - competitor_overview takes optional second param, others don't
  const moduleMap: Record<ModuleKey, (data: SiteData, ...args: any[]) => Promise<ModuleResult>> = {
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
        // Pass competitor URL only to competitor_overview module
        const result = moduleKey === 'competitor_overview'
          ? await moduleMap[moduleKey](siteData, competitorUrl)
          : await moduleMap[moduleKey](siteData)
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

