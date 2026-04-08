/**
 * Fetch interceptor handlers for oRPC integration tests.
 * These intercept at the fetch level to test the full oRPC
 * serialization/deserialization round-trip without MSW.
 *
 * oRPC wire format:
 * - URL: POST {baseUrl}/{path.join('/')}
 * - Request body: { json: <input>, meta?: [...] }
 * - Response body: { json: <output>, meta?: [...] }
 * - Error: oRPC error JSON with HTTP status code
 */

export interface CapturedRequest {
  url: string
  method: string
  body: unknown
}

export interface HandlerConfig {
  'powersync/token'?: {
    response?: unknown
    status?: number
    error?: boolean
    errorBody?: unknown
  }
  'powersync/applyWrite'?: {
    response?: unknown
    status?: number
    error?: boolean
    errorBody?: unknown
  }
}

export function createFetchInterceptor(config: HandlerConfig) {
  const captured: CapturedRequest[] = []

  const mockFetch: typeof fetch = async (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url
    const method = init?.method ?? 'POST'
    const body = init?.body ? JSON.parse(init.body as string) : undefined

    captured.push({ url, method, body })

    for (const [path, handler] of Object.entries(config)) {
      if (url.endsWith(`/${path}`)) {
        if (handler?.error)
          throw new TypeError('network error: Failed to fetch')

        const status = handler?.status ?? 200
        const responseBody =
          status >= 400
            ? JSON.stringify(
                handler?.errorBody ?? {
                  defined: true,
                  code: 'UNAUTHORIZED',
                  status,
                  message: 'UNAUTHORIZED'
                }
              )
            : JSON.stringify({ json: handler?.response ?? {} })

        return new Response(responseBody, {
          status,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    throw new Error(`Unhandled request: ${method} ${url}`)
  }

  return { mockFetch, captured }
}

export function defaultTokenResponse() {
  return {
    token: 'test-token',
    endpoint: 'https://ps.test.local',
    expiresAt: new Date(Date.now() + 600_000).toISOString()
  }
}
