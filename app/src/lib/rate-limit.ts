import { NextRequest, NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory rate limit store (resets on server restart)
// For production, use Redis or similar
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean every minute

interface RateLimitConfig {
  windowMs: number  // Time window in milliseconds
  max: number       // Maximum requests per window
  keyPrefix?: string
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export function rateLimit(request: NextRequest, config: RateLimitConfig): {
  success: boolean
  remaining: number
  resetAt: number
} {
  const ip = getClientIp(request)
  const key = `${config.keyPrefix || 'rl'}:${ip}`
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  // Reset if window has passed
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs
    }
  }

  entry.count++
  rateLimitStore.set(key, entry)

  const remaining = Math.max(0, config.max - entry.count)
  const success = entry.count <= config.max

  return {
    success,
    remaining,
    resetAt: entry.resetAt
  }
}

export function rateLimitResponse(resetAt: number): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)

  return NextResponse.json(
    { error: 'För många förfrågningar. Försök igen senare.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000))
      }
    }
  )
}

// Pre-configured rate limiters for different endpoints
export const rateLimiters = {
  // Waitlist: 5 requests per minute per IP
  waitlist: (request: NextRequest) => rateLimit(request, {
    windowMs: 60 * 1000,
    max: 5,
    keyPrefix: 'waitlist'
  }),

  // Sign token lookup: 30 requests per minute per IP
  signToken: (request: NextRequest) => rateLimit(request, {
    windowMs: 60 * 1000,
    max: 30,
    keyPrefix: 'sign'
  }),

  // Signature submission: 10 requests per minute per IP
  signSubmit: (request: NextRequest) => rateLimit(request, {
    windowMs: 60 * 1000,
    max: 10,
    keyPrefix: 'submit'
  })
}
