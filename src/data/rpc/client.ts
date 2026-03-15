import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { Platform } from 'react-native'

import type { RouterClient } from '@orpc/server'

import type { AppRouter } from '@/data/server/api'
import { authClient } from '@/lib/auth/auth-client'
import { buildApiUrl } from '@/lib/config/api-origin'

const link = new RPCLink({
  url: buildApiUrl('/api/rpc'),
  headers() {
    const headers: Record<string, string> = {}
    if (Platform.OS !== 'web') {
      const cookies = authClient.getCookie()
      if (cookies) headers['Cookie'] = cookies
    }
    return headers
  },
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: Platform.OS === 'web' ? 'include' : 'omit'
    })
  },
  interceptors: __DEV__
    ? [
        async options => {
          const label = options.path.join('.')
          const start = performance.now()
          try {
            const result = await options.next()
            const ms = Math.round(performance.now() - start)
            console.log(`[rpc] ✓ ${label} (${ms}ms)`, {
              input: options.input,
              output: result
            })
            return result
          } catch (error) {
            const ms = Math.round(performance.now() - start)
            console.error(`[rpc] ✗ ${label} (${ms}ms)`, {
              input: options.input,
              error
            })
            throw error
          }
        }
      ]
    : []
})

export const rpcClient = createORPCClient<RouterClient<AppRouter>>(link)
