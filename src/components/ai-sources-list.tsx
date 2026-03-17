import { Linking, Pressable, Text, View } from 'react-native'

interface AiSourcesListProps {
  sources: string[]
  className?: string
}

export function AiSourcesList({ sources, className }: AiSourcesListProps) {
  if (sources.length === 0) return null

  return (
    <View className={`gap-1 ${className ?? ''}`}>
      <Text className="text-muted text-xs font-medium uppercase">Sources</Text>
      {sources.map((source, i) => (
        <Pressable
          key={i}
          onPress={() => Linking.openURL(source)}
          className="active:opacity-70"
        >
          <Text className="text-xs text-blue-500" numberOfLines={1}>
            {source}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}
