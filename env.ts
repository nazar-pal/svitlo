import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

function loadEnvFileIfPresent(path: string) {
  try {
    process.loadEnvFile?.(path)
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !('code' in error) ||
      error.code !== 'ENOENT'
    ) {
      throw error
    }
  }
}

loadEnvFileIfPresent('.env.local')
loadEnvFileIfPresent('.env')

const serverSchema = {
  DATABASE_URL: z.string().trim().min(1),
  BETTER_AUTH_SECRET: z.string().trim().min(1),

  /** The public URL where the auth server is reachable.
   *  Required for: preview, production.
   *  Development: omit — defaults to the local dev server in auth.ts. */
  BETTER_AUTH_URL: z.string().trim().min(1).optional(),

  POWERSYNC_URL: z.url(),
  POWERSYNC_PRIVATE_KEY: z.string().trim().min(32)
}

const clientSchema = {
  /** The public API origin used by native clients.
   *  Required for: preview, production (native builds).
   *  Development: omit — derived automatically from the Expo dev server host. */
  EXPO_PUBLIC_API_URL: z.string().trim().min(1).optional(),

  /** The current build variant.
   *  Required for: preview, production.
   *  Development: omit — app.config.ts and runtime code treat absence as development. */
  EXPO_PUBLIC_APP_VARIANT: z
    .enum(['development', 'preview', 'production'])
    .optional()
}

type RuntimeEnv = Record<string, string | undefined>

export function createRuntimeEnv(runtimeEnv: RuntimeEnv) {
  return createEnv({
    clientPrefix: 'EXPO_PUBLIC_',
    server: serverSchema,
    client: clientSchema,
    runtimeEnvStrict: {
      DATABASE_URL: runtimeEnv.DATABASE_URL,
      BETTER_AUTH_SECRET: runtimeEnv.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: runtimeEnv.BETTER_AUTH_URL,
      POWERSYNC_URL: runtimeEnv.POWERSYNC_URL,
      POWERSYNC_PRIVATE_KEY: runtimeEnv.POWERSYNC_PRIVATE_KEY,
      EXPO_PUBLIC_API_URL: runtimeEnv.EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_APP_VARIANT: runtimeEnv.EXPO_PUBLIC_APP_VARIANT
    },
    emptyStringAsUndefined: true,
    // Expo native bundles don't have `window`, so we also use EXPO_OS to
    // distinguish native client code from actual server runtimes.
    isServer:
      typeof window === 'undefined' &&
      runtimeEnv.EXPO_OS !== 'ios' &&
      runtimeEnv.EXPO_OS !== 'android' &&
      runtimeEnv.EXPO_OS !== 'web'
  })
}

export const env = createRuntimeEnv(process.env)
