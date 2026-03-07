import { Platform } from 'react-native'

function getApiBaseUrl() {
  if (Platform.OS === 'web') {
    return ''
  }

  const baseUrl = process.env.EXPO_PUBLIC_API_URL

  if (!baseUrl) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is required for native API route requests.'
    )
  }

  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getApiBaseUrl()}${normalizedPath}`
}
