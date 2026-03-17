import { useEffect, useState } from 'react'
import { Keyboard } from 'react-native'

export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', e =>
      setKeyboardHeight(e.endCoordinates.height)
    )
    const hideSub = Keyboard.addListener('keyboardWillHide', () =>
      setKeyboardHeight(0)
    )
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  return keyboardHeight
}
