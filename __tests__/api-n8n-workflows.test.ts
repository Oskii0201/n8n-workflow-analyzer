import { POST as workflowsPOST } from '../src/app/api/n8n/workflows/route'
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

describe('POST /api/n8n/workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetRateLimitState()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetAuthContext.mockResolvedValue({ user: null, supabase: {} })
    const request = new Request('http://localhost/api/n8n/workflows', {
      method: 'POST',
      headers: { 'x-forwarded-for': '127.0.0.1' },
      body: JSON.stringify({}),
    })

    const response = await workflowsPOST(request as any)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('returns workflows list on success', async () => {
    mockGetAuthContext.mockResolvedValue({ user: { id: 'user-1' }, supabase: {} })
    mockResolveConnection.mockResolvedValue({
      ok: true,
      baseUrl: 'https://n8n.example.com',
      apiKey: 'test-key',
    })
    mockFetchN8n
      .mockResolvedValueOnce({
        ok: true,
        data: { data: [{ id: 'wf-1', name: 'W1', active: true, nodes: [], updatedAt: 'now' }] },
      })
      .mockResolvedValueOnce({ ok: true, data: { data: [], nextCursor: undefined } })

    const request = new Request('http://localhost/api/n8n/workflows', {
      method: 'POST',
      headers: { 'x-forwarded-for': '127.0.0.1' },
      body: JSON.stringify({}),
    })

    const response = await workflowsPOST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.workflows).toHaveLength(1)
    expect(mockFetchN8n).toHaveBeenCalled()
  })

  it('returns 429 when rate limited', async () => {
    mockGetAuthContext.mockResolvedValue({ user: { id: 'user-1' }, supabase: {} })
    mockResolveConnection.mockResolvedValue({
      ok: true,
      baseUrl: 'https://n8n.example.com',
      apiKey: 'test-key',
    })
    mockFetchN8n.mockResolvedValue({ ok: true, data: { data: [], nextCursor: undefined } })

    const request = new Request('http://localhost/api/n8n/workflows', {
      method: 'POST',
      headers: { 'x-forwarded-for': '127.0.0.2' },
      body: JSON.stringify({}),
    })

    for (let i = 0; i < 30; i += 1) {
      await workflowsPOST(request as any)
    }

    const response = await workflowsPOST(request as any)
    const data = await response.json()
    expect(response.status).toBe(429)
    expect(data.success).toBe(false)
  })
})
