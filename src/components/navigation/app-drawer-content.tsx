import { type DrawerContentComponentProps } from '@react-navigation/drawer'
import { ScrollView } from 'react-native'

import { SafeAreaView } from '@/components/uniwind'

import { DrawerFooter } from './drawer-footer'
import { DrawerHeader } from './drawer-header'
import { DrawerInvitationsSection } from './drawer-invitations-section'
import { DrawerOrgSection } from './drawer-org-section'

export function AppDrawerContent(props: DrawerContentComponentProps) {
  return (
    <SafeAreaView testID="drawer-content" className="bg-background flex-1">
      <DrawerHeader />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-7 px-5"
        showsVerticalScrollIndicator={false}
      >
        <DrawerOrgSection navigation={props.navigation} />
        <DrawerInvitationsSection />
      </ScrollView>
      <DrawerFooter />
    </SafeAreaView>
  )
}
