import {
  GENERATOR_STATUS_META,
  type GeneratorStatus
} from '@/lib/generator/status'
import { Chip } from 'heroui-native'

interface GeneratorStatusBadgeProps {
  status: GeneratorStatus
  size?: 'sm' | 'md'
}

export function GeneratorStatusBadge({
  status,
  size = 'sm'
}: GeneratorStatusBadgeProps) {
  return (
    <Chip
      size={size}
      variant="soft"
      color={GENERATOR_STATUS_META[status].color}
    >
      <Chip.Label>{GENERATOR_STATUS_META[status].label}</Chip.Label>
    </Chip>
  )
}
