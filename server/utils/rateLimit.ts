import type { H3Event } from 'h3'

// In-memory sliding-window limiter. Sufficient for a single instance;
// swap the store for Redis if the app is ever scaled horizontally.
const hits = new Map<string, number[]>()

interface RateLimitOptions {
  bucket: string
  max: number
  windowMs: number
}

export function assertRateLimit(event: H3Event, { bucket, max, windowMs }: RateLimitOptions) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const key = `${bucket}:${ip}`
  const now = Date.now()
  const windowStart = now - windowMs

  const recent = (hits.get(key) ?? []).filter((t) => t > windowStart)
  if (recent.length >= max) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests. Try again later.' })
  }
  recent.push(now)
  hits.set(key, recent)

  // Opportunistic cleanup so the map does not grow unbounded.
  if (hits.size > 10_000) {
    for (const [k, v] of hits) {
      if (v.every((t) => t <= windowStart)) hits.delete(k)
    }
  }
}
