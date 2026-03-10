import Constants from 'expo-constants'
import { Platform } from 'react-native'

import { env } from '@/env'
import { DEFAULT_LOCAL_API_URL } from '../const'

function normalizeApiOrigin(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

/**
 * In dev mode, derive the API origin from the dev server host so it works on
 * both simulators (localhost) and physical devices (LAN IP) automatically.
 */
function getDevServerOrigin() {
  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ?? Constants.expoConfig?.hostUri

  if (debuggerHost) {
    const [host, port] = debuggerHost.split(':')
    return `http://${host}:${port || '8081'}`
  }

  console.warn(
    'Could not determine dev server host. Falling back to localhost:8081. ' +
      'This will not work on physical devices.'
  )
  return DEFAULT_LOCAL_API_URL
}

function getConfiguredNativeApiOrigin() {
  if (__DEV__) {
    return getDevServerOrigin()
  }

  const configuredOrigin = env.EXPO_PUBLIC_API_URL

  if (configuredOrigin) {
    return normalizeApiOrigin(configuredOrigin)
  }

  throw new Error(
    'EXPO_PUBLIC_API_URL is required for native builds outside local development.'
  )
}

function getApiBaseUrl() {
  if (Platform.OS === 'web') {
    return ''
  }

  return getConfiguredNativeApiOrigin()
}

export function getPublicApiOrigin() {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      return window.location.origin
    }

    const configuredOrigin = env.EXPO_PUBLIC_API_URL

    if (configuredOrigin) {
      return normalizeApiOrigin(configuredOrigin)
    }

    if (__DEV__) {
      return DEFAULT_LOCAL_API_URL
    }

    throw new Error(
      'EXPO_PUBLIC_API_URL is required when resolving API origins on the server.'
    )
  }

  return getApiBaseUrl()
}

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getApiBaseUrl()}${normalizedPath}`
}
