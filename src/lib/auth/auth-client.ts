import { expoClient } from '@better-auth/expo/client'
import { createAuthClient } from 'better-auth/react'
import * as SecureStore from 'expo-secure-store'

import { getPublicApiOrigin } from '@/lib/config/api-origin'
import { AUTH_STORAGE_PREFIX } from '@/lib/config/const'
import { APP_SCHEME } from '../../../app.config'

const baseURL = new URL('/api/auth', getPublicApiOrigin()).toString()

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    expoClient({
      scheme: APP_SCHEME,
      storage: SecureStore,
      storagePrefix: AUTH_STORAGE_PREFIX
    })
  ]
})
