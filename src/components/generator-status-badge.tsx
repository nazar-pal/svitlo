import {
  GENERATOR_STATUS_KEYS,
  GENERATOR_STATUS_META,
  type GeneratorStatus
} from '@/lib/generator/status'
import { Chip } from 'heroui-native'

import { useTranslation } from '@/lib/i18n'

interface GeneratorStatusBadgeProps {
  status: GeneratorStatus
  size?: 'sm' | 'md'
}

export function GeneratorStatusBadge({
  status,
  size = 'sm'
}: GeneratorStatusBadgeProps) {
  const { t } = useTranslation()

  return (
    <Chip
      size={size}
      variant="soft"
      color={GENERATOR_STATUS_META[status].color}
    >
      <Chip.Label>{t(GENERATOR_STATUS_KEYS[status])}</Chip.Label>
    </Chip>
  )
}
