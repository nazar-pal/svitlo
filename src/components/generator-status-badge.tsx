import { Chip } from 'heroui-native'

const COLOR_MAP = {
  running: 'success',
  resting: 'warning',
  available: 'accent'
} as const

const LABEL_MAP = {
  running: 'Running',
  resting: 'Resting',
  available: 'Available'
} as const

type GeneratorStatus = keyof typeof COLOR_MAP

interface GeneratorStatusBadgeProps {
  status: GeneratorStatus
  size?: 'sm' | 'md'
}

export function GeneratorStatusBadge({
  status,
  size = 'sm'
}: GeneratorStatusBadgeProps) {
  return (
    <Chip size={size} variant="soft" color={COLOR_MAP[status]}>
      {LABEL_MAP[status]}
    </Chip>
  )
}
