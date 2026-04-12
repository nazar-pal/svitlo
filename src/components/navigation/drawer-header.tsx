import { Avatar } from 'heroui-native'
import { Text, View } from 'react-native'

import { LanguageMenu } from '@/components/language-menu'
import { SyncStatusIndicator } from '@/components/sync-status-indicator'
import { useTranslation } from '@/lib/i18n'
import { useLocalUser } from '@/lib/powersync'

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function DrawerHeader() {
  const localUser = useLocalUser()
  const { t } = useTranslation()

  const userEmail = localUser?.email ?? ''
  const userName = localUser?.name || t('common.unknown')

  return (
    <View className="items-center gap-2 py-8">
      <Avatar size="lg" color="accent" alt={userName}>
        {localUser?.image ? (
          <Avatar.Image source={{ uri: localUser.image }} />
        ) : null}
        <Avatar.Fallback>{getInitials(userName)}</Avatar.Fallback>
      </Avatar>
      <Text className="text-foreground text-lg font-semibold">{userName}</Text>
      <Text className="text-muted text-sm">{userEmail}</Text>
      <View className="flex-row items-center gap-2">
        <SyncStatusIndicator />
        <Text className="text-muted text-xs">·</Text>
        <LanguageMenu />
      </View>
    </View>
  )
}
