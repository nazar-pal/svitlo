import { BlurView } from 'expo-blur'
import { Dialog } from 'heroui-native'
import { StyleSheet } from 'react-native'

export function BlurDialogOverlay() {
  return (
    <Dialog.Overlay>
      <BlurView
        tint="systemMaterial"
        intensity={20}
        style={StyleSheet.absoluteFill}
      />
    </Dialog.Overlay>
  )
}
