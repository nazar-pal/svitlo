import { Host, Button as SwiftButton } from '@expo/ui/swift-ui'
import { disabled, font, labelStyle } from '@expo/ui/swift-ui/modifiers'
import type { SFSymbol } from 'sf-symbols-typescript'

import { useTranslation } from '@/lib/i18n'

interface HeaderSubmitButtonProps {
  systemImage?: SFSymbol
  onPress: () => void
  isDisabled?: boolean
  testID?: string
}

export function HeaderSubmitButton({
  systemImage,
  onPress,
  isDisabled,
  testID = 'header-submit'
}: HeaderSubmitButtonProps) {
  const { t } = useTranslation()

  return (
    <Host matchContents>
      <SwiftButton
        testID={testID}
        label={t('common.submit')}
        systemImage={systemImage || 'checkmark'}
        onPress={onPress}
        modifiers={[
          labelStyle('iconOnly'),
          font({ size: 20 }),
          disabled(!!isDisabled)
        ]}
      />
    </Host>
  )
}
