#!/usr/bin/env node
/**
 * Generate a branded og:image for SEO CheckSite
 * Uses sharp for rendering
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 1200;
const HEIGHT = 630;

const sky700 = '#0369a1';
const sky500 = '#0ea5e9';

const svgText = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${sky700};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${sky500};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.15);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgba(255,255,255,0.05);stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  
  <circle cx="100" cy="100" r="300" fill="url(#accent)"/>
  <circle cx="1100" cy="500" r="250" fill="url(#accent)"/>
  <circle cx="600" cy="315" r="200" fill="rgba(255,255,255,0.03)"/>
  
  <circle cx="600" cy="180" r="55" fill="rgba(255,255,255,0.15)"/>
  <circle cx="600" cy="180" r="45" fill="none" stroke="white" stroke-width="3"/>
  <path d="M 580 180 L 595 195 L 620 165" stroke="white" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  
  <text x="600" y="290" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="800" fill="white" text-anchor="middle" letter-spacing="4">SEO</text>
  <text x="600" y="360" font-family="system-ui, -apple-system, sans-serif" font-size="56" font-weight="700" fill="white" text-anchor="middle" letter-spacing="2">CheckSite</text>
  
  <rect x="380" y="400" width="440" height="1" fill="rgba(255,255,255,0.3)"/>
  <text x="600" y="440" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="400" fill="rgba(255,255,255,0.85)" text-anchor="middle" letter-spacing="1">Website Audit · Made Simple</text>
  <rect x="380" y="460" width="440" height="1" fill="rgba(255,255,255,0.3)"/>
  
  <text x="600" y="540" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="400" fill="rgba(255,255,255,0.6)" text-anchor="middle" letter-spacing="1">seochecksite.net</text>
</svg>`;

async function generate() {
  const outputPath = path.join(__dirname, '..', 'public', 'og-image.jpg');
  
  const svgBuffer = Buffer.from(svgText);
  
  await sharp(svgBuffer)
    .jpeg({ quality: 95 })
    .toFile(outputPath);
  
  console.log('✅ Generated:', outputPath);
  
  const metadata = await sharp(outputPath).metadata();
  console.log('Dimensions:', metadata.width, 'x', metadata.height);
  console.log('File size:', fs.statSync(outputPath).size, 'bytes');
}

generate().catch(console.error);
