import { createTRPCClient, httpBatchLink, loggerLink } from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import { Platform } from 'react-native'
import superjson from 'superjson'

import type { AppRouter } from '@/data/server/api'
import { authClient } from '@/lib/auth/auth-client'
import { buildApiUrl } from '@/lib/config/api-origin'

import { queryClient } from './query-client'

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    loggerLink({
      enabled: op =>
        __DEV__ || (op.direction === 'down' && op.result instanceof Error),
      colorMode: 'none'
    }),
    httpBatchLink({
      transformer: superjson,
      url: buildApiUrl('/api/trpc'),
      headers() {
        const headers: Record<string, string> = {
          'x-trpc-source': 'expo-react',
          'Content-Type': 'application/json'
        }
        if (Platform.OS !== 'web') {
          const cookies = authClient.getCookie()
          if (cookies) {
            headers['Cookie'] = cookies
          }
        }
        return headers
      },
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: Platform.OS === 'web' ? 'include' : 'omit'
        })
      }
    })
  ]
})

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient
})
