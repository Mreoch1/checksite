/**
 * Check if a URL is reachable from our server (e.g. before creating an audit).
 * Tries the normalized URL and, if the host has no "www", also tries the www variant.
 */

const REACHABILITY_TIMEOUT_MS = 12_000

export type ReachabilityResult =
  | { ok: true; url: string }
  | { ok: false; message: string }

/**
 * Try to fetch the URL with a short timeout. Returns ok:true with the URL we used if any attempt succeeds.
 */
export async function checkUrlReachable(normalizedUrl: string): Promise<ReachabilityResult> {
  const urlsToTry: string[] = [normalizedUrl]

  try {
    const parsed = new URL(normalizedUrl)
    const host = parsed.hostname.toLowerCase()
    if (!host.startsWith('www.')) {
      parsed.hostname = `www.${host}`
      urlsToTry.push(parsed.toString())
    } else {
      const nonWww = host.replace(/^www\./, '')
      if (nonWww !== host) {
        parsed.hostname = nonWww
        urlsToTry.push(parsed.toString())
      }
    }
  } catch {
    // If URL parsing fails, we only try the original
  }

  for (const url of urlsToTry) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REACHABILITY_TIMEOUT_MS)
      let response = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO CheckSite/1.0)' },
        redirect: 'follow',
        signal: controller.signal,
      })
      if (response.status === 405) {
        clearTimeout(timeoutId)
        const c2 = new AbortController()
        const t2 = setTimeout(() => c2.abort(), REACHABILITY_TIMEOUT_MS)
        response = await fetch(url, {
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO CheckSite/1.0)' },
          redirect: 'follow',
          signal: c2.signal,
        })
        clearTimeout(t2)
      } else {
        clearTimeout(timeoutId)
      }
      if (response.ok || response.status < 500) {
        return { ok: true, url }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (err instanceof Error && err.name === 'AbortError') {
        continue // timeout, try next URL
      }
      // Log but try next URL
      console.warn(`[checkUrlReachable] ${url}: ${msg}`)
    }
  }

  return {
    ok: false,
    message:
      "We couldn't reach this website from our servers. Common causes: the site may be down, the address might be wrong (try adding or removing www), your host or a security plugin may be blocking our check, or there could be an SSL or network issue. Please verify the URL works in your browser and try again.",
  }
}
