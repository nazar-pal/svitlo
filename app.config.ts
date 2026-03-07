import type { ConfigContext, ExpoConfig } from 'expo/config'

const IS_DEV = process.env.EXPO_PUBLIC_APP_VARIANT === 'development'
const IS_PREVIEW = process.env.EXPO_PUBLIC_APP_VARIANT === 'preview'

const APP_ID_PREFIX = 'com.devnazar.svitlo'

const getUniqueIdentifier = () => {
  if (IS_DEV) return `${APP_ID_PREFIX}.dev`
  if (IS_PREVIEW) return `${APP_ID_PREFIX}.preview`
  return APP_ID_PREFIX // TODO: maybe `${APP_ID_PREFIX}.app` for production ?
}

const getAppName = () => {
  if (IS_DEV) return 'Svitlo (Dev)'
  if (IS_PREVIEW) return 'Svitlo (Preview)'
  return 'Svitlo'
}

const EAS_PROJECT_ID = 'b2d90d72-b3bf-4519-a298-bca139cf9ce9'
const EAS_APP_OWNER = 'devnazar'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  owner: EAS_APP_OWNER,
  name: getAppName(),
  slug: 'svitlo',
  version: '1.0.0',
  orientation: 'portrait',
  platforms: ['ios', 'web'],
  icon: './assets/images/icon.png',
  scheme: 'svitlo',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
    supportsTablet: false,
    bundleIdentifier: getUniqueIdentifier()
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
    ]
  ],
  extra: {
    eas: {
      projectId: EAS_PROJECT_ID
    }
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true
  }
})
