import { Host, Button as SwiftButton } from '@expo/ui/swift-ui'
import { font, labelStyle } from '@expo/ui/swift-ui/modifiers'
import { useRouter } from 'expo-router'

export function ModalCloseButton() {
  const router = useRouter()

  return (
    <Host matchContents>
      <SwiftButton
        label="Close"
        systemImage="xmark"
        onPress={() => router.back()}
        modifiers={[labelStyle('iconOnly'), font({ size: 20 })]}
      />
    </Host>
  )
}
