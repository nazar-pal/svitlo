import { useThemeColor } from 'heroui-native'
import { processColor } from 'react-native'

export function colorToRgb(color: string): readonly [number, number, number] {
  const processed = processColor(color)
  if (typeof processed !== 'number') return [0.5, 0.5, 0.5]
  const r = ((processed >> 16) & 0xff) / 255
  const g = ((processed >> 8) & 0xff) / 255
  const b = (processed & 0xff) / 255
  return [r, g, b] as const
}

export function useStatusColors() {
  const [success, warning, danger] = useThemeColor([
    'success',
    'warning',
    'danger'
  ])
  return {
    success: colorToRgb(success),
    warning: colorToRgb(warning),
    danger: colorToRgb(danger)
  }
}
