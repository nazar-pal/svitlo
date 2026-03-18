import { Host, Button as SwiftButton } from '@expo/ui/swift-ui'
import { disabled, font, labelStyle } from '@expo/ui/swift-ui/modifiers'
import type { SFSymbol } from 'sf-symbols-typescript'

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
  return (
    <Host matchContents>
      <SwiftButton
        label="Submit"
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
