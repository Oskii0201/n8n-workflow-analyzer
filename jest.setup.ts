import '@testing-library/jest-dom'

// Ensure Request/Response/Headers are available in JSDOM for route tests
if (!globalThis.Headers) {
  class Headers {
    private map: Map<string, string>

    constructor(init?: Record<string, string>) {
      this.map = new Map()
      if (init) {
        Object.entries(init).forEach(([key, value]) => {
          this.map.set(key.toLowerCase(), value)
        })
      }
    }

    get(name: string) {
      return this.map.get(name.toLowerCase()) || null
    }
  }

  globalThis.Headers = Headers as unknown as typeof globalThis.Headers
}

if (!globalThis.Request) {
  class Request {
    url: string
    method: string
    headers: Headers
    private body: string | undefined

    constructor(input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) {
      this.url = input
      this.method = init?.method ?? 'GET'
      this.headers = new Headers(init?.headers)
      this.body = init?.body
    }

    async json() {
      if (!this.body) return {}
      return JSON.parse(this.body)
    }
  }

  globalThis.Request = Request as unknown as typeof globalThis.Request
}

if (!globalThis.Response) {
  class Response {
    private body: string
    status: number
    headers: Headers

    constructor(body: string, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body
      this.status = init?.status ?? 200
      this.headers = new Headers(init?.headers)
    }

    async json() {
      return JSON.parse(this.body)
    }

    static json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      return new Response(JSON.stringify(data), init)
    }
  }

  globalThis.Response = Response as unknown as typeof globalThis.Response
}

// Mock crypto for encryption tests
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock fetch
global.fetch = jest.fn()

// Extend expect with jest-dom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveValue(value: string): R;
      toBeDisabled(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
} 
