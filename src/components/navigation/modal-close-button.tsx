import { Host, Button as SwiftButton } from '@expo/ui/swift-ui'
import { font, labelStyle } from '@expo/ui/swift-ui/modifiers'
import { useRouter } from 'expo-router'

import { useTranslation } from '@/lib/i18n'

export function ModalCloseButton() {
  const router = useRouter()
  const { t } = useTranslation()

  return (
    <Host matchContents>
      <SwiftButton
        label={t('common.close')}
        systemImage="xmark"
        onPress={() => router.back()}
        modifiers={[labelStyle('iconOnly'), font({ size: 20 })]}
      />
    </Host>
  )
}
