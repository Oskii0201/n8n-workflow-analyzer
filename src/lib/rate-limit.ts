type RateLimitOptions = {
  limit: number
  windowMs: number
}

type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number; clientId: string }

type RateLimitEntry = {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitEntry>()

function getClientId(request: Request, keyPrefix: string) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'
  return `${keyPrefix}:${ip}`
}

export function rateLimit(
  request: Request,
  keyPrefix: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now()
  const clientId = getClientId(request, keyPrefix)
  const entry = buckets.get(clientId)

  if (!entry || entry.resetAt <= now) {
    buckets.set(clientId, { count: 1, resetAt: now + options.windowMs })
    return { ok: true }
  }

  if (entry.count >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
    console.warn(`[rate-limit] ${clientId} exceeded limit for ${keyPrefix}`)
    return { ok: false, retryAfterSeconds, clientId }
  }

  entry.count += 1
  return { ok: true }
}

export function resetRateLimitState() {
  buckets.clear()
}
