import { SymbolView } from 'expo-symbols'
import { Button } from 'heroui-native'
import { Text, View } from 'react-native'
import { useCSSVariable } from 'uniwind'

interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction
}: EmptyStateProps) {
  const mutedColor = useCSSVariable('--color-muted') as string | undefined

  return (
    <View className="items-center gap-4 py-12">
      <SymbolView name={icon as any} size={48} tintColor={mutedColor} />
      <View className="items-center gap-2">
        <Text className="text-foreground text-center text-lg font-semibold">
          {title}
        </Text>
        {description ? (
          <Text className="text-muted max-w-[280px] text-center text-[15px] leading-[22px]">
            {description}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Button variant="primary" onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  )
}
