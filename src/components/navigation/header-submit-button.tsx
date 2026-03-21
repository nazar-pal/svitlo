import { Host, Button as SwiftButton } from '@expo/ui/swift-ui'
import { disabled, font, labelStyle } from '@expo/ui/swift-ui/modifiers'
import type { SFSymbol } from 'sf-symbols-typescript'

import { useTranslation } from '@/lib/i18n'

interface HeaderSubmitButtonProps {
  systemImage?: SFSymbol
  onPress: () => void
  isDisabled?: boolean
}

export function HeaderSubmitButton({
  systemImage,
  onPress,
  isDisabled
}: HeaderSubmitButtonProps) {
  const { t } = useTranslation()

  return (
    <Host matchContents>
      <SwiftButton
        label={t('common.submit')}
        systemImage={systemImage || 'checkmark'}
        onPress={onPress}
        modifiers={[
          labelStyle('iconOnly'),
          font({ size: 20 }),
          ...(isDisabled ? [disabled(true)] : [])
        ]}
      />
    </Host>
  )
}
