import { Drawer } from 'expo-router/drawer'
import { useCSSVariable } from 'uniwind'

import { AppDrawerContent } from '@/components/app-drawer-content'

export default function DrawerLayout() {
  const backgroundColor = useCSSVariable('--color-background') as string

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
