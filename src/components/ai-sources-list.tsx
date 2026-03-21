import { Linking, Pressable, Text, View } from 'react-native'

import { useTranslation } from '@/lib/i18n'

interface AiSourcesListProps {
  sources: string[]
  className?: string
}

export function AiSourcesList({ sources, className }: AiSourcesListProps) {
  const { t } = useTranslation()

  if (sources.length === 0) return null

  return (
    <View className={`gap-1 ${className ?? ''}`}>
      <Text className="text-muted text-xs font-medium uppercase">
        {t('aiSuggestions.sources')}
      </Text>
      {sources.map((source, i) => (
        <Pressable
          key={i}
          onPress={() => Linking.openURL(source)}
          className="active:opacity-70"
        >
          <Text className="text-accent text-xs" numberOfLines={1}>
            {source}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}
