/**
 * Search API integration for competitor identification
 * Supports SerpAPI and Bing Web Search API
 */

const SERPAPI_KEY = process.env.SERPAPI_API_KEY
const BING_SEARCH_API_KEY = process.env.BING_SEARCH_API_KEY
const BING_SEARCH_ENDPOINT = process.env.BING_SEARCH_ENDPOINT || 'https://api.bing.microsoft.com/v7.0/search'

/**
 * Search for competitors using available search API
 */
export async function searchCompetitors(
  businessName: string,
  industry: string,
  location?: string,
  excludeDomain?: string
): Promise<{ url: string; title: string }[]> {
  // Try SerpAPI first (if configured)
  if (SERPAPI_KEY) {
    try {
      return await searchWithSerpAPI(businessName, industry, location, excludeDomain)
    } catch (error) {
      console.warn('[searchCompetitors] SerpAPI failed, trying Bing:', error)
    }
  }

  // Try Bing Web Search API (if configured)
  if (BING_SEARCH_API_KEY) {
    try {
      return await searchWithBing(businessName, industry, location, excludeDomain)
    } catch (error) {
      console.warn('[searchCompetitors] Bing Search failed:', error)
    }
  }

  // No search API configured
  console.warn('[searchCompetitors] No search API configured (SERPAPI_API_KEY or BING_SEARCH_API_KEY)')
  return []
}

/**
 * Search using SerpAPI
 */
async function searchWithSerpAPI(
  businessName: string,
  industry: string,
  location: string | undefined,
  excludeDomain: string | undefined
): Promise<{ url: string; title: string }[]> {
  if (!SERPAPI_KEY) {
    throw new Error('SERPAPI_API_KEY not configured')
  }

  // Build search query
  let query = `${businessName} ${industry}`
  if (location) {
    query += ` ${location}`
  }

  const params = new URLSearchParams({
    q: query,
    api_key: SERPAPI_KEY,
    engine: 'google',
    num: '10', // Get top 10 results
  })

  const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
    headers: {
      'User-Agent': 'SEO CheckSite/1.0',
    },
  })

  if (!response.ok) {
    throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const results: { url: string; title: string }[] = []

  // Extract organic results
  if (data.organic_results && Array.isArray(data.organic_results)) {
    for (const result of data.organic_results) {
      if (result.link && result.title) {
        try {
          const url = new URL(result.link)
          // Filter out excluded domain
          if (excludeDomain && url.hostname === excludeDomain) {
            continue
          }
          // Filter out directories, social media, marketplaces
          const hostname = url.hostname.toLowerCase()
          if (
            hostname.includes('yelp.com') ||
            hostname.includes('google.com') ||
            hostname.includes('facebook.com') ||
            hostname.includes('linkedin.com') ||
            hostname.includes('instagram.com') ||
            hostname.includes('amazon.com') ||
            hostname.includes('etsy.com') ||
            hostname.includes('yellowpages.com') ||
            hostname.includes('bbb.org')
          ) {
            continue
          }
          results.push({
            url: result.link,
            title: result.title,
          })
        } catch (urlError) {
          // Invalid URL, skip
          continue
        }
      }
    }
  }

  return results.slice(0, 2) // Return top 2 competitors
}

/**
 * Search using Bing Web Search API
 */
async function searchWithBing(
  businessName: string,
  industry: string,
  location: string | undefined,
  excludeDomain: string | undefined
): Promise<{ url: string; title: string }[]> {
  if (!BING_SEARCH_API_KEY) {
    throw new Error('BING_SEARCH_API_KEY not configured')
  }

  // Build search query
  let query = `${businessName} ${industry}`
  if (location) {
    query += ` ${location}`
  }

  // Add exclusion if domain provided
  if (excludeDomain) {
    query += ` -site:${excludeDomain}`
  }

  const response = await fetch(`${BING_SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}&count=10`, {
    headers: {
      'Ocp-Apim-Subscription-Key': BING_SEARCH_API_KEY,
      'User-Agent': 'SEO CheckSite/1.0',
    },
  })

  if (!response.ok) {
    throw new Error(`Bing Search request failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const results: { url: string; title: string }[] = []

  // Extract web pages
  if (data.webPages && data.webPages.value && Array.isArray(data.webPages.value)) {
    for (const page of data.webPages.value) {
      if (page.url && page.name) {
        try {
          const url = new URL(page.url)
          // Filter out excluded domain (double check)
          if (excludeDomain && url.hostname === excludeDomain) {
            continue
          }
          // Filter out directories, social media, marketplaces
          const hostname = url.hostname.toLowerCase()
          if (
            hostname.includes('yelp.com') ||
            hostname.includes('google.com') ||
            hostname.includes('facebook.com') ||
            hostname.includes('linkedin.com') ||
            hostname.includes('instagram.com') ||
            hostname.includes('amazon.com') ||
            hostname.includes('etsy.com') ||
            hostname.includes('yellowpages.com') ||
            hostname.includes('bbb.org')
          ) {
            continue
          }
          results.push({
            url: page.url,
            title: page.name,
          })
        } catch (urlError) {
          // Invalid URL, skip
          continue
        }
      }
    }
  }

  return results.slice(0, 2) // Return top 2 competitors
}

