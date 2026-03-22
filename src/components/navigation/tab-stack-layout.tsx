import { DrawerTriggerButton } from './drawer-trigger-button'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { Stack } from 'expo-router'
import { useThemeColor } from 'heroui-native'

export function TabStackLayout({
  title,
  gestureEnabled = true
}: {
  title: string
  gestureEnabled?: boolean
}) {
  const tabBarBackgroundColor = useThemeColor('background')

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
        headerShadowVisible: false,
        headerLeft: () => <DrawerTriggerButton />
      }}
    >
      <Stack.Screen
        name={'index'}
        options={{
          title,
          gestureEnabled,
          headerShown: true,
          headerStyle: {
            backgroundColor: isLiquidGlassAvailable()
              ? 'transparent'
              : tabBarBackgroundColor
          }
        }}
      />
    </Stack>
  )
}
