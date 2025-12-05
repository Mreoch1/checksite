/**
 * Screenshot capture utility using Playwright
 * Free, reliable, and full control over screenshot generation
 * 
 * Playwright is better than Puppeteer:
 * - Auto wait for network
 * - Better mobile emulation
 * - More robust error handling
 * - Supports multiple browsers (Chromium, Firefox, WebKit)
 */

import { chromium, Browser, Page } from 'playwright'

// Configuration
const SCREENSHOT_ENABLED = process.env.ENABLE_SCREENSHOTS !== 'false' // Default: enabled
const SCREENSHOT_TIMEOUT = 30000 // 30 seconds timeout
const SCREENSHOT_WAIT_TIME = 2000 // Wait 2 seconds after page load

/**
 * Capture a screenshot of a website using Playwright
 * Returns base64 encoded image data URL or null if failed
 */
export async function captureScreenshot(
  url: string,
  options: {
    width?: number
    height?: number
    device?: 'desktop' | 'mobile'
  } = {}
): Promise<string | null> {
  const { width = 1280, height = 720, device = 'desktop' } = options

  // Graceful degradation if screenshots disabled
  if (!SCREENSHOT_ENABLED) {
    console.log('📸 Screenshots disabled via ENABLE_SCREENSHOTS=false')
    return null
  }

  let browser: Browser | null = null

  try {
    // Launch browser (headless mode)
    console.log(`📸 Launching browser for ${device} screenshot of ${url}`)
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    })

    const context = await browser.newContext({
      viewport: device === 'mobile' 
        ? { width: 375, height: 667 }
        : { width, height },
      userAgent: device === 'mobile'
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      deviceScaleFactor: device === 'mobile' ? 2 : 1,
    })

    const page = await context.newPage()

    // Navigate to URL with timeout
    console.log(`📸 Loading page: ${url}`)
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: SCREENSHOT_TIMEOUT,
    })

    // Wait additional time for dynamic content
    await page.waitForTimeout(SCREENSHOT_WAIT_TIME)

    // Take full page screenshot
    console.log(`📸 Capturing ${device} screenshot...`)
    const screenshotBuffer = await page.screenshot({
      fullPage: true,
      type: 'png',
    })

    // Convert to base64 data URL
    const base64 = screenshotBuffer.toString('base64')
    const dataUrl = `data:image/png;base64,${base64}`

    console.log(`✅ Screenshot captured (${device}): ${(screenshotBuffer.length / 1024).toFixed(2)} KB`)
    return dataUrl
  } catch (error) {
    console.error(`❌ Error capturing ${device} screenshot:`, error)
    return null
  } finally {
    if (browser) {
      await browser.close()
      console.log(`📸 Browser closed`)
    }
  }
}

/**
 * Capture both desktop and mobile screenshots
 * Returns object with base64 data URLs for desktop and mobile
 */
export async function captureWebsiteScreenshots(url: string): Promise<{
  desktop?: string
  mobile?: string
}> {
  const screenshots: { desktop?: string; mobile?: string } = {}

  if (!SCREENSHOT_ENABLED) {
    console.log('📸 Screenshots disabled, skipping capture')
    return screenshots
  }

  try {
    // Capture desktop screenshot
    console.log('📸 Starting desktop screenshot capture...')
    const desktopScreenshot = await captureScreenshot(url, {
      width: 1280,
      height: 720,
      device: 'desktop',
    })
    if (desktopScreenshot) {
      screenshots.desktop = desktopScreenshot
      console.log('✅ Desktop screenshot captured')
    }

    // Small delay between captures
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Capture mobile screenshot
    console.log('📸 Starting mobile screenshot capture...')
    const mobileScreenshot = await captureScreenshot(url, {
      width: 375,
      height: 667,
      device: 'mobile',
    })
    if (mobileScreenshot) {
      screenshots.mobile = mobileScreenshot
      console.log('✅ Mobile screenshot captured')
    }
  } catch (error) {
    console.error('❌ Error capturing website screenshots:', error)
  }

  return screenshots
}

