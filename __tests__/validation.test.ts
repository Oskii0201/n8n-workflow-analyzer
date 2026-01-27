import { requireString, requireUrl } from '../src/lib/validation'

describe('validation', () => {
  it('requires non-empty string', () => {
    expect(requireString('', 'name', { minLength: 1 }).ok).toBe(false)
    expect(requireString(' ok ', 'name', { minLength: 1, trim: true }).ok).toBe(true)
  })

  it('validates http/https URLs and trims trailing slash', () => {
    const result = requireUrl('https://example.com/', 'base_url')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe('https://example.com')
    }
  })

  it('rejects invalid URLs', () => {
    expect(requireUrl('ftp://example.com', 'base_url').ok).toBe(false)
    expect(requireUrl('not-a-url', 'base_url').ok).toBe(false)
  })
})
