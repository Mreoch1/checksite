/**
 * Normalizes a URL by:
 * 1. Trimming whitespace
 * 2. Adding https:// if no protocol is provided
 * 3. Lowercasing the domain part (but preserving path/query/fragment case)
 * 
 * @param url - The URL to normalize
 * @returns The normalized URL
 */
export function normalizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('URL must be a non-empty string')
  }

  let normalized = url.trim()

  // Add https:// if no protocol is provided
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`
  }

  try {
    // Parse the URL to separate domain from path/query/fragment
    const urlObj = new URL(normalized)
    
    // Lowercase the hostname (domain) but preserve path, query, and fragment
    urlObj.hostname = urlObj.hostname.toLowerCase()
    
    // Reconstruct the URL
    normalized = urlObj.toString()
  } catch (error) {
    // If URL parsing fails, just lowercase the entire string as fallback
    // This handles edge cases where the URL might be malformed
    console.warn(`Failed to parse URL "${normalized}", using lowercase fallback:`, error)
    normalized = normalized.toLowerCase()
  }

  return normalized
}

