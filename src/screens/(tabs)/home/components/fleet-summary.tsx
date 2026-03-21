import {
  GENERATOR_STATUS_KEYS,
  GENERATOR_STATUS_META,
  type GeneratorStatus,
  type StatusCounts
} from '@/lib/generator/status'
import { Chip } from 'heroui-native'
import { View } from 'react-native'

import { useTranslation } from '@/lib/i18n'

const STATUSES: GeneratorStatus[] = ['running', 'resting', 'available']

const DOT_BG: Record<GeneratorStatus, string> = {
  running: 'bg-success',
  resting: 'bg-warning',
  available: 'bg-accent'
}

export function FleetSummary(counts: StatusCounts) {
  const { t } = useTranslation()

  return (
    <View className="flex-row gap-2">
      {STATUSES.map(status => {
        const { color } = GENERATOR_STATUS_META[status]
        const empty = counts[status] === 0
        return (
          <Chip
            key={status}
            variant="soft"
            color={color}
            size="sm"
            className={empty ? 'opacity-40' : ''}
          >
            <View className={`${DOT_BG[status]} size-1.5 rounded-full`} />
            <Chip.Label>
              {counts[status]} {t(GENERATOR_STATUS_KEYS[status])}
            </Chip.Label>
          </Chip>
        )
      })}
    </View>
  )
}
