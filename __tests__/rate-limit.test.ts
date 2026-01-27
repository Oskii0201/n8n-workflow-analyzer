import { rateLimit, resetRateLimitState } from '../src/lib/rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    resetRateLimitState()
  })

  it('allows up to the limit within the window', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '127.0.0.1' },
    })

    const options = { limit: 2, windowMs: 60_000 }
    expect(rateLimit(request, 'test', options).ok).toBe(true)
    expect(rateLimit(request, 'test', options).ok).toBe(true)
    const blocked = rateLimit(request, 'test', options)
    expect(blocked.ok).toBe(false)
  })

  it('separates clients by IP', () => {
    const requestA = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '127.0.0.1' },
    })
    const requestB = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '127.0.0.2' },
    })

    const options = { limit: 1, windowMs: 60_000 }
    expect(rateLimit(requestA, 'test', options).ok).toBe(true)
    expect(rateLimit(requestA, 'test', options).ok).toBe(false)
    expect(rateLimit(requestB, 'test', options).ok).toBe(true)
  })
})
