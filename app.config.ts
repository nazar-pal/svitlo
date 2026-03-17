import type { ConfigContext, ExpoConfig } from 'expo/config'

const APP_ID_PREFIX = 'com.devnazar.svitlo'
export const APP_SCHEME = 'svitlo'

export function getAppIdentifier() {
  const variant = process.env.EXPO_PUBLIC_APP_VARIANT

  if (variant === 'development') return `${APP_ID_PREFIX}.dev`
  if (variant === 'preview') return `${APP_ID_PREFIX}.preview`

  return APP_ID_PREFIX
}

export function getAppName() {
  const variant = process.env.EXPO_PUBLIC_APP_VARIANT

  if (variant === 'development') return 'Svitlo (Dev)'
  if (variant === 'preview') return 'Svitlo (Preview)'

  return 'Svitlo'
}

const EAS_PROJECT_ID = 'b2d90d72-b3bf-4519-a298-bca139cf9ce9'
const EAS_APP_OWNER = 'devnazar'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  owner: EAS_APP_OWNER,
  name: getAppName(),
  slug: 'svitlo',
  version: '1.0.4',
  orientation: 'portrait',
  platforms: ['ios', 'web'],
  icon: './assets/images/icon.png',
  scheme: APP_SCHEME,
  userInterfaceStyle: 'automatic',
  ios: {
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    },
    icon: './assets/app.icon',
    supportsTablet: false,
    bundleIdentifier: getAppIdentifier(),
    usesAppleSignIn: true
  },
  web: {
    bundler: 'metro',
    output: 'server',
    favicon: './assets/images/favicon.png'
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF'
      }
    ],
    'expo-secure-store',
    'expo-web-browser',
    'expo-apple-authentication'
  ],
  extra: {
    eas: {
      projectId: EAS_PROJECT_ID
    }
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true
  },
  updates: {
    url: 'https://u.expo.dev/b2d90d72-b3bf-4519-a298-bca139cf9ce9'
  },
  runtimeVersion: {
    policy: 'appVersion'
  }
})
