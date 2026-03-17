import * as SecureStore from 'expo-secure-store'

import { AUTH_STORAGE_PREFIX } from '@/lib/config/const'

// Bump to invalidate all stored identities (e.g. after a breaking format change).
// On next launch the revalidation cycle re-persists a fresh identity.
const LOCAL_IDENTITY_VERSION = 1

const STORAGE_KEY = `${AUTH_STORAGE_PREFIX}_offline_identity`
const STORE_OPTS = { keychainAccessible: SecureStore.WHEN_UNLOCKED } as const

export interface LocalIdentity {
  version: typeof LOCAL_IDENTITY_VERSION
  userId: string
}

function parse(value: string | null): LocalIdentity | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (
      parsed?.version !== LOCAL_IDENTITY_VERSION ||
      typeof parsed.userId !== 'string'
    ) {
      return null
    }
    return parsed satisfies LocalIdentity
  } catch {
    return null
  }
}

export async function getLocalIdentity(): Promise<LocalIdentity | null> {
  return parse(await SecureStore.getItemAsync(STORAGE_KEY, STORE_OPTS))
}

export async function persistLocalIdentity(
  userId: string
): Promise<LocalIdentity> {
  const identity: LocalIdentity = { version: LOCAL_IDENTITY_VERSION, userId }
  await SecureStore.setItemAsync(
    STORAGE_KEY,
    JSON.stringify(identity),
    STORE_OPTS
  )
  return identity
}

export async function clearLocalIdentity(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY, STORE_OPTS)
}
