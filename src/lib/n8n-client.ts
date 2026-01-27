type N8nFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string }

const DEFAULT_TIMEOUT_MS = 15000

export async function fetchN8n<T>(
  url: string,
  apiKey: string,
  options?: { method?: string; body?: unknown; timeoutMs?: number }
): Promise<N8nFetchResult<T>> {
  const controller = new AbortController()
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: options?.method ?? 'GET',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `HTTP error! status: ${response.status}`

      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }

      return { ok: false, status: response.status, error: errorMessage }
    }

    const data = (await response.json()) as T
    return { ok: true, data }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, status: 504, error: 'Upstream request timed out' }
    }
    const message =
      error instanceof Error ? error.message : 'Unknown error'
    return { ok: false, status: 500, error: message }
  } finally {
    clearTimeout(timeoutId)
  }
}
