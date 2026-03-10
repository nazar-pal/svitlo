import { defineConfig } from 'drizzle-kit'

import { env } from './env'

export default defineConfig({
  out: './src/data/server/migrations',
  schema: './src/data/server/db-schema',
  dialect: 'postgresql',
  dbCredentials: { url: env.DATABASE_URL },
  casing: 'snake_case'
})
