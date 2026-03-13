import { Image as ExpoImage } from 'expo-image'
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context'
import { withUniwind } from 'uniwind'

export const Image = withUniwind(ExpoImage)
export const SafeAreaView = withUniwind(RNSafeAreaView)
