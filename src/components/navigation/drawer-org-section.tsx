import {
  Host,
  Button as SwiftButton,
  Menu as SwiftMenu
} from '@expo/ui/swift-ui'
import { labelStyle } from '@expo/ui/swift-ui/modifiers'
import type { DrawerContentComponentProps } from '@react-navigation/drawer'
import { DrawerActions } from '@react-navigation/native'
import { useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { ListGroup, Separator, useThemeColor } from 'heroui-native'
import { useState } from 'react'
import { View } from 'react-native'

import { CreateOrgDialog } from '@/components/create-org-dialog'
import { DeleteOrgDialog } from '@/components/delete-org-dialog'
import { LeaveOrgDialog } from '@/components/leave-org-dialog'
import { SectionHeader } from '@/components/section-header'
import { selection } from '@/lib/haptics'
import { useTranslation } from '@/lib/i18n'
import { useSelectedOrg } from '@/lib/organization/use-selected-org'
import { useUserOrgs } from '@/lib/organization/use-user-orgs'

interface DrawerOrgSectionProps {
  navigation: DrawerContentComponentProps['navigation']
}

export function DrawerOrgSection({ navigation }: DrawerOrgSectionProps) {
  const router = useRouter()
  const { userOrgs, isAdmin } = useUserOrgs()
  const { selectedOrgId, setSelectedOrgId } = useSelectedOrg()
  const foregroundColor = useThemeColor('foreground')
  const accentColor = useThemeColor('accent')
  const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null)
  const [leaveOrgId, setLeaveOrgId] = useState<string | null>(null)
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false)
  const { t } = useTranslation()

  return (
    <>
      <View className="gap-2">
        <SectionHeader title={t('drawer.organization')} />
        <ListGroup>
          {userOrgs.map((org, index) => (
            <View key={org.id}>
              {index > 0 ? <Separator className="mx-4" /> : null}
              <ListGroup.Item
                testID={`drawer-org-${org.name}`}
                accessibilityLabel={org.name}
                className={
                  org.id === selectedOrgId ? 'bg-accent/10' : undefined
                }
                onPress={() => {
                  selection()
                  setSelectedOrgId(org.id)
                }}
              >
                <ListGroup.ItemPrefix>
                  <View>
                    <SymbolView
                      name="building.2.fill"
                      size={20}
                      tintColor={foregroundColor}
                    />
                    {isAdmin(org.id) ? (
                      <View className="bg-background absolute -right-1 -bottom-1 rounded-full p-px">
                        <SymbolView
                          name="shield.fill"
                          size={10}
                          tintColor={accentColor}
                        />
                      </View>
                    ) : null}
                  </View>
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle
                    className={
                      org.id === selectedOrgId ? 'font-semibold' : undefined
                    }
                  >
                    {org.name}
                  </ListGroup.ItemTitle>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix>
                  <Host matchContents>
                    <SwiftMenu
                      label={t('common.actions')}
                      systemImage="ellipsis"
                      modifiers={[labelStyle('iconOnly')]}
                    >
                      {isAdmin(org.id) ? (
                        <>
                          <SwiftButton
                            label={t('drawer.rename')}
                            systemImage="pencil"
                            onPress={() =>
                              router.push(`/organization/${org.id}/rename`)
                            }
                          />
                          <SwiftButton
                            label={t('drawer.delete')}
                            systemImage="trash"
                            role="destructive"
                            onPress={() => setDeleteOrgId(org.id)}
                          />
                        </>
                      ) : (
                        <SwiftButton
                          label={t('drawer.leave')}
                          systemImage="rectangle.portrait.and.arrow.right"
                          role="destructive"
                          onPress={() => setLeaveOrgId(org.id)}
                        />
                      )}
                    </SwiftMenu>
                  </Host>
                </ListGroup.ItemSuffix>
              </ListGroup.Item>
            </View>
          ))}
          <Separator className="mx-4" />
          <ListGroup.Item
            testID="drawer-create-org"
            onPress={() => {
              navigation.dispatch(DrawerActions.closeDrawer())
              setIsCreateOrgOpen(true)
            }}
          >
            <ListGroup.ItemPrefix>
              <SymbolView name="plus" size={20} tintColor={foregroundColor} />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>
                {t('drawer.createOrganization')}
              </ListGroup.ItemTitle>
            </ListGroup.ItemContent>
          </ListGroup.Item>
        </ListGroup>
      </View>

      <CreateOrgDialog
        isOpen={isCreateOrgOpen}
        onClose={() => setIsCreateOrgOpen(false)}
      />

      <DeleteOrgDialog
        key={`delete-${deleteOrgId}`}
        orgId={deleteOrgId}
        onClose={() => setDeleteOrgId(null)}
        onDeleted={() => {
          router.navigate('/(protected)/(drawer)/(tabs)/(home)')
          navigation.dispatch(DrawerActions.closeDrawer())
        }}
      />

      <LeaveOrgDialog
        key={`leave-${leaveOrgId}`}
        orgId={leaveOrgId}
        onClose={() => setLeaveOrgId(null)}
        onLeft={() => {
          router.navigate('/(protected)/(drawer)/(tabs)/(home)')
          navigation.dispatch(DrawerActions.closeDrawer())
        }}
      />
    </>
  )
}
