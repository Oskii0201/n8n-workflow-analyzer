import { POST as searchPOST } from '../src/app/api/n8n/search-variable/route'
import { resetRateLimitState } from '../src/lib/rate-limit'

const mockGetAuthContext = jest.fn()
jest.mock('../src/lib/auth-helpers', () => ({
  getAuthContext: () => mockGetAuthContext(),
}))

const mockResolveConnection = jest.fn()
jest.mock('../src/lib/n8n-connection', () => ({
  resolveConnection: (...args: unknown[]) => mockResolveConnection(...args),
}))

const mockFetchN8n = jest.fn()
jest.mock('../src/lib/n8n-client', () => ({
  fetchN8n: (...args: unknown[]) => mockFetchN8n(...args),
}))

describe('POST /api/n8n/search-variable', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetRateLimitState()
  })

  it('returns 400 when missing params', async () => {
    mockGetAuthContext.mockResolvedValue({ user: { id: 'user-1' }, supabase: {} })
    const request = new Request('http://localhost/api/n8n/search-variable', {
      method: 'POST',
      headers: { 'x-forwarded-for': '127.0.0.1' },
      body: JSON.stringify({}),
    })

    const response = await searchPOST(request as any)
    const data = await response.json()
    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetAuthContext.mockResolvedValue({ user: null, supabase: {} })
    const request = new Request('http://localhost/api/n8n/search-variable', {
      method: 'POST',
      headers: { 'x-forwarded-for': '127.0.0.1' },
      body: JSON.stringify({ workflowId: 'wf-1', searchTerm: 'json' }),
    })

    const response = await searchPOST(request as any)
    const data = await response.json()
    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('returns results on success', async () => {
    mockGetAuthContext.mockResolvedValue({ user: { id: 'user-1' }, supabase: {} })
    mockResolveConnection.mockResolvedValue({
      ok: true,
      baseUrl: 'https://n8n.example.com',
      apiKey: 'test-key',
    })
    mockFetchN8n.mockResolvedValue({
      ok: true,
      data: {
        data: {
          id: 'wf-1',
          name: 'Test',
          nodes: [
            {
              id: 'node-1',
              name: 'Set',
              type: 'n8n-nodes-base.set',
              typeVersion: 1,
              position: [0, 0],
              parameters: { value: '{{$json.test}}' },
            },
          ],
          connections: {},
          settings: {},
          active: true,
          createdAt: 'now',
          updatedAt: 'now',
        },
      },
    })

    const request = new Request('http://localhost/api/n8n/search-variable', {
      method: 'POST',
      headers: { 'x-forwarded-for': '127.0.0.1' },
      body: JSON.stringify({ workflowId: 'wf-1', searchTerm: 'json' }),
    })

    const response = await searchPOST(request as any)
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.results.length).toBeGreaterThan(0)
  })

  it('returns 429 when rate limited', async () => {
    mockGetAuthContext.mockResolvedValue({ user: { id: 'user-1' }, supabase: {} })
    mockResolveConnection.mockResolvedValue({
      ok: true,
      baseUrl: 'https://n8n.example.com',
      apiKey: 'test-key',
    })
    mockFetchN8n.mockResolvedValue({
      ok: true,
      data: { data: { id: 'wf', name: 'wf', nodes: [], connections: {}, settings: {}, active: false } },
    })

    const request = new Request('http://localhost/api/n8n/search-variable', {
      method: 'POST',
      headers: { 'x-forwarded-for': '127.0.0.2' },
      body: JSON.stringify({ workflowId: 'wf-1', searchTerm: 'json' }),
    })

    for (let i = 0; i < 20; i += 1) {
      await searchPOST(request as any)
    }

    const response = await searchPOST(request as any)
    const data = await response.json()
    expect(response.status).toBe(429)
    expect(data.success).toBe(false)
  })
})
