import { DrawerTriggerButton } from '@/components/drawer-trigger-button'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { Stack } from 'expo-router'
import { useCSSVariable } from 'uniwind'

export function TabStackLayout({ title }: { title: string }) {
  const tabBarBackgroundColor = useCSSVariable('--color-background') as string

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
