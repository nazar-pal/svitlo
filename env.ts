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
  BETTER_AUTH_URL: z.string().trim().min(1).optional(),
  POWERSYNC_URL: z.url(),
  POWERSYNC_PRIVATE_KEY: z.string().trim().min(32),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().trim().min(1)
}

const clientSchema = {
  EXPO_PUBLIC_API_URL: z.string().trim().min(1).optional(),
  EXPO_PUBLIC_APP_VARIANT: z
    .enum(['development', 'preview', 'production'])
    .optional()
}

export const env = createEnv({
  clientPrefix: 'EXPO_PUBLIC_',
  server: serverSchema,
  client: clientSchema,
  runtimeEnvStrict: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    POWERSYNC_URL: process.env.POWERSYNC_URL,
    POWERSYNC_PRIVATE_KEY: process.env.POWERSYNC_PRIVATE_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_APP_VARIANT: process.env.EXPO_PUBLIC_APP_VARIANT
  },
  emptyStringAsUndefined: true
})
