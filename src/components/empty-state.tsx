import { SymbolView } from 'expo-symbols'
import { Button, useThemeColor } from 'heroui-native'
import { Text, View } from 'react-native'

interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  testID?: string
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  testID
}: EmptyStateProps) {
  const mutedColor = useThemeColor('muted')

  return (
    <View testID={testID} className="items-center gap-4 py-12">
      <SymbolView name={icon as any} size={48} tintColor={mutedColor} />
      <View className="items-center gap-2">
        <Text className="text-foreground text-center text-lg font-semibold">
          {title}
        </Text>
        {description ? (
          <Text className="text-muted text-3.75 max-w-70 text-center leading-5.5">
            {description}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Button
          variant="primary"
          onPress={onAction}
          testID={testID ? `${testID}-action` : undefined}
        >
          {actionLabel}
        </Button>
      ) : null}
    </View>
  )
}
