import { db } from '@/data/server'
import * as schema from '@/data/server/db-schema'
import { env } from '@/env'
import { DEFAULT_LOCAL_API_URL } from '@/lib/const'
import { expo } from '@better-auth/expo'
import { type DynamicBaseURLConfig, betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APP_SCHEME } from '../../../app.config'

function getAuthBaseUrl(): string | DynamicBaseURLConfig {
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL

  if (__DEV__) {
    return {
      allowedHosts: [
        'localhost:8081',
        '127.0.0.1:8081',
        '*.local:8081',
        '192.168.*:8081',
        '10.*:8081',
        '172.16.*:8081'
      ],
      fallback: DEFAULT_LOCAL_API_URL,
      protocol: 'http'
    }
  }

  throw new Error(
    'BETTER_AUTH_URL is required for preview and production builds.'
  )
}

const authBaseUrl = getAuthBaseUrl()

export const auth = betterAuth({
  appName: 'Svitlo',
  baseURL: authBaseUrl,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema
  }),
  trustedOrigins: getTrustedOrigins(authBaseUrl),
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh daily when online
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5
    },
    deferSessionRefresh: true
  },
  account: {
    skipStateCookieCheck: true
  },
  socialProviders: {
    apple: {
      clientId: 'com.devnazar.svitlo',
      audience: [
        'com.devnazar.svitlo',
        'com.devnazar.svitlo.dev',
        'com.devnazar.svitlo.preview'
      ]
    }
  },
  databaseHooks: {
    user: {
      create: {
        after: async user => {
          await db.insert(schema.organizations).values({
            id: crypto.randomUUID(),
            name: 'Default',
            adminUserId: user.id,
            createdAt: new Date()
          })
        }
      }
    }
  },
  plugins: [expo()]
})

function getTrustedOrigins(baseUrl: string | DynamicBaseURLConfig) {
  const trustedOrigins = new Set<string>(['https://appleid.apple.com'])

  if (typeof baseUrl === 'string') {
    trustedOrigins.add(new URL(baseUrl).origin)
  }

  trustedOrigins.add(`${APP_SCHEME}://`)
  trustedOrigins.add(`${APP_SCHEME}://*`)

  if (process.env.NODE_ENV !== 'production') {
    trustedOrigins.add('exp://')
    trustedOrigins.add('exp://**')
    trustedOrigins.add(DEFAULT_LOCAL_API_URL)
    trustedOrigins.add('http://127.0.0.1:8081')
  }

  return [...trustedOrigins]
}
