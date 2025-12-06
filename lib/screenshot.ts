/**
 * Screenshot capture utility
 * 
 * ⚠️ IMPORTANT: Playwright cannot run in Netlify Functions
 * - Browser binaries are not available in Netlify Functions runtime
 * - Playwright + Chromium bundle is too large (~160MB) for serverless limits
 * 
 * CURRENT IMPLEMENTATION: Gracefully disabled by default
 * - Screenshots are optional - reports work perfectly without them
 * - Set ENABLE_SCREENSHOTS=false to explicitly disable
 * 
 * FUTURE: Use separate screenshot service
 * - Deploy Playwright service to Render, Railway, Fly.io, or VPS
 * - Call screenshot service API from Netlify Functions
 * - See services/screenshot-service/ for example implementation
 */

// Helper to check if Playwright is available
// In Netlify Functions, Playwright browser binaries are not available
async function getPlaywright() {
  try {
    return await import('playwright')
  } catch (error) {
    return null
  }
}

// Configuration
// Default: DISABLED in Netlify Functions (Playwright cannot run there)
// Enable only if SCREENSHOT_SERVICE_URL is set (external service) or ENABLE_SCREENSHOTS=true explicitly
const SCREENSHOT_ENABLED = process.env.ENABLE_SCREENSHOTS === 'true' || !!process.env.SCREENSHOT_SERVICE_URL
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
    console.log('📸 Screenshots disabled (not enabled via ENABLE_SCREENSHOTS=true or SCREENSHOT_SERVICE_URL)')
    return null
  }

  // Check if screenshot service is configured (preferred method - works in Netlify Functions)
  const SCREENSHOT_SERVICE_URL = process.env.SCREENSHOT_SERVICE_URL
  if (SCREENSHOT_SERVICE_URL) {
    console.log(`📸 Using external screenshot service: ${SCREENSHOT_SERVICE_URL}`)
    try {
      const response = await fetch(`${SCREENSHOT_SERVICE_URL}/screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, mode: device }),
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.imageUrl) {
          console.log(`✅ Screenshot captured via service: ${result.imageUrl}`)
          return result.imageUrl
        }
      }
    } catch (error) {
      console.warn('⚠️  Screenshot service error:', error)
      return null
    }
  }

  // Only try local Playwright if explicitly enabled AND screenshot service not configured
  // In Netlify Functions, Playwright browser binaries are not available - this will fail
  // Only use this for local development or environments with browser binaries
  if (process.env.ENABLE_SCREENSHOTS === 'true' && !SCREENSHOT_SERVICE_URL) {
    const playwright = await getPlaywright()
    if (!playwright) {
      console.log('📸 Playwright not available (expected in Netlify Functions - use SCREENSHOT_SERVICE_URL instead)')
      return null
    }

    // Try local Playwright (only works in environments with browser binaries - NOT Netlify Functions)
    let browser: any = null

    try {
      // Launch browser (headless mode)
      console.log(`📸 Launching browser for ${device} screenshot of ${url}`)
      browser = await playwright.chromium.launch({
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

  // If we get here, screenshots are disabled or no service configured
  return null
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


