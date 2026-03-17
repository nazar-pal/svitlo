// Third-party components wrapped with `withUniwind` for className support.
// Wrap once here, import everywhere — never call withUniwind on the same
// component in multiple files.
// https://uniwind.dev/docs/core-concepts/third-party-components

import { KeyboardAwareScrollView as RNKeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context'
import { withUniwind } from 'uniwind'

export const KeyboardAwareScrollView = withUniwind(RNKeyboardAwareScrollView)
export const SafeAreaView = withUniwind(RNSafeAreaView)
