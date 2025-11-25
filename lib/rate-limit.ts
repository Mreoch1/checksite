/**
 * Simple in-memory rate limiting
 * For production, consider using Redis or a service like Upstash
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetAt: number
  }
}

const store: RateLimitStore = {}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach(key => {
    if (store[key].resetAt < now) {
      delete store[key]
    }
  })
}, 5 * 60 * 1000)

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute default
): RateLimitResult {
  const now = Date.now()
  const key = identifier
  
  if (!store[key] || store[key].resetAt < now) {
    // New window
    store[key] = {
      count: 1,
      resetAt: now + windowMs,
    }
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: store[key].resetAt,
    }
  }
  
  // Existing window
  store[key].count++
  
  if (store[key].count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: store[key].resetAt,
    }
  }
  
  return {
    allowed: true,
    remaining: maxRequests - store[key].count,
    resetAt: store[key].resetAt,
  }
}

/**
 * Get client identifier from request
 */
export function getClientId(request: Request | { headers: Headers }): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const headers = 'headers' in request ? request.headers : (request as Request).headers
  const forwarded = headers.get('x-forwarded-for')
  const realIp = headers.get('x-real-ip')
  const cfConnectingIp = headers.get('cf-connecting-ip') // Cloudflare
  
  const ip = cfConnectingIp || realIp || (forwarded ? forwarded.split(',')[0].trim() : null) || 'unknown'
  return ip
}

