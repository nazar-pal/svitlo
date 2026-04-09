import { requireOptionalNativeModule } from 'expo-modules-core'

// Hide the Expo dev menu floating action button so it does not intercept
// taps on the navigation header in iOS dev builds. The dev menu is still
// accessible via Cmd+D or the shake gesture. E2E tests (Maestro) tap on
// `header-submit` which occupies the same top-right region as the FAB.
if (__DEV__) {
  const DevMenuPreferences = requireOptionalNativeModule<{
    setPreferencesAsync: (settings: {
      showFloatingActionButton?: boolean
    }) => Promise<void>
  }>('DevMenuPreferences')
  DevMenuPreferences?.setPreferencesAsync({ showFloatingActionButton: false })
}
