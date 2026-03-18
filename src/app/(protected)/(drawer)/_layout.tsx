import { Drawer } from 'expo-router/drawer'
import { useThemeColor } from 'heroui-native'

import { AppDrawerContent } from '@/components/navigation/app-drawer-content'

export default function DrawerLayout() {
  const backgroundColor = useThemeColor('background')

  return (
    <Drawer
      drawerContent={props => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: 'left',
        drawerType: 'front',
        drawerStyle: { backgroundColor }
      }}
    >
      <Drawer.Screen name="(tabs)" />
    </Drawer>
  )
}
