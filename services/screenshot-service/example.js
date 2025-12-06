/**
 * Example Screenshot Service
 * 
 * This is a standalone Node.js service that runs Playwright
 * Deploy this to Render, Railway, Fly.io, or a VPS
 * 
 * Your Netlify Functions call this service instead of trying to run Playwright themselves
 */

import express from "express";
import { chromium } from "playwright";
import { uploadToStorage } from "./storage.js"; // Implement your storage upload

const app = express();
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "screenshot-service" });
});

// Screenshot endpoint
app.post("/screenshot", async (req, res) => {
  const { url, mode = "desktop", auditId } = req.body;

  if (!url) {
    return res.status(400).json({ error: "url is required" });
  }

  let browser = null;

  try {
    console.log(`[screenshot] Capturing ${mode} screenshot for ${url}`);

    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();

    // Set viewport based on mode
    if (mode === "mobile") {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.setUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      );
    } else {
      await page.setViewportSize({ width: 1280, height: 720 });
    }

    // Navigate and wait for page to load
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000); // Wait for dynamic content

    // Take full page screenshot
    const buffer = await page.screenshot({ fullPage: true, type: 'png' });
    await browser.close();
    browser = null;

    // Upload to storage and get public URL
    const imageUrl = await uploadToStorage(buffer, {
      auditId,
      mode,
      url,
    });

    console.log(`[screenshot] ✅ Screenshot captured and uploaded: ${imageUrl}`);

    res.json({
      success: true,
      imageUrl,
      mode,
      url,
      auditId,
    });
  } catch (error) {
    console.error(`[screenshot] ❌ Error:`, error);
    
    if (browser) {
      await browser.close();
    }

    res.status(500).json({
      error: "Failed to capture screenshot",
      message: error.message,
    });
  }
});

// Batch endpoint for desktop + mobile
app.post("/screenshots", async (req, res) => {
  const { url, auditId } = req.body;

  if (!url) {
    return res.status(400).json({ error: "url is required" });
  }

  try {
    // Capture both desktop and mobile
    const [desktopResult, mobileResult] = await Promise.all([
      fetch(`http://localhost:${process.env.PORT || 3000}/screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, mode: 'desktop', auditId }),
      }).then(r => r.json()),
      fetch(`http://localhost:${process.env.PORT || 3000}/screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, mode: 'mobile', auditId }),
      }).then(r => r.json()),
    ]);

    res.json({
      success: true,
      desktop: desktopResult.imageUrl,
      mobile: mobileResult.imageUrl,
      auditId,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to capture screenshots",
      message: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Screenshot service running on port ${PORT}`);
});

