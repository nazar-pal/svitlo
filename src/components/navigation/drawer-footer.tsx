import { useRouter } from 'expo-router'
import { Button } from 'heroui-native'
import { View } from 'react-native'

import { useAuthSession } from '@/lib/auth/session'
import { useTranslation } from '@/lib/i18n'

export function DrawerFooter() {
  const router = useRouter()
  const { status: sessionStatus, signOut } = useAuthSession()
  const { t } = useTranslation()

  return (
    <View className="gap-2 px-5 pt-2 pb-4">
      {sessionStatus === 'expired' ? (
        <Button
          variant="primary"
          onPress={() => router.push('/(protected)/re-auth')}
        >
          {t('common.signIn')}
        </Button>
      ) : null}
      <Button testID="drawer-sign-out" variant="danger-soft" onPress={signOut}>
        {t('common.signOut')}
      </Button>
    </View>
  )
}
