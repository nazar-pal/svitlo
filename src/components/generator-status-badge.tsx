import { Text, View } from 'react-native'

const STATUS_CONFIG = {
  running: { label: 'Running', bg: 'bg-green-500/15', text: 'text-green-600' },
  resting: {
    label: 'Resting',
    bg: 'bg-orange-500/15',
    text: 'text-orange-600'
  },
  available: { label: 'Available', bg: 'bg-blue-500/15', text: 'text-blue-600' }
} as const

type GeneratorStatus = keyof typeof STATUS_CONFIG

interface GeneratorStatusBadgeProps {
  status: GeneratorStatus
  size?: 'sm' | 'md'
}

export function GeneratorStatusBadge({
  status,
  size = 'sm'
}: GeneratorStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  const paddingClass = size === 'sm' ? 'px-2.5 py-0.5' : 'px-3 py-1'
  const textClass =
    size === 'sm' ? 'text-xs font-semibold' : 'text-sm font-semibold'

  return (
    <View className={`self-start rounded-full ${config.bg} ${paddingClass}`}>
      <Text className={`${config.text} ${textClass}`}>{config.label}</Text>
    </View>
  )
}
