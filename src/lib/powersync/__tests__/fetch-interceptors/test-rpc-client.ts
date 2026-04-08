/**
 * Minimal oRPC-compatible client for integration tests.
 * Implements the oRPC wire format without importing @orpc/client
 * (which is ESM-only and incompatible with Jest 29's CJS runtime).
 *
 * Wire format:
 * - URL: POST {baseUrl}/{path}
 * - Request body: { json: <input> }
 * - Response body: { json: <output> } or oRPC error JSON
 */

async function rpcCall(
  fetchFn: typeof fetch,
  baseUrl: string,
  path: string,
  input?: unknown
) {
  const url = `${baseUrl}/${path}`
  const response = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: input })
  })

  const data = await response.json()

  if (!response.ok) {
    const error = new Error(data.message ?? 'RPC error')
    Object.assign(error, { code: data.code, status: data.status })
    throw error
  }

  return data.json
}

export function createTestRpcClient(fetchFn: typeof fetch) {
  const baseUrl = 'http://test.local/api/rpc'
  return {
    powersync: {
      token: (input?: unknown) =>
        rpcCall(fetchFn, baseUrl, 'powersync/token', input),
      applyWrite: (input: unknown) =>
        rpcCall(fetchFn, baseUrl, 'powersync/applyWrite', input)
    }
  }
}
