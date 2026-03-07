import React, { type ReactNode } from 'react'
import { Text, View } from 'react-native'

type HintRowProps = {
  title?: string
  hint?: ReactNode
}

export function HintRow({
  title = 'Try editing',
  hint = (
    <Text className="text-muted font-mono text-xs font-medium">
      app/index.tsx
    </Text>
  )
}: HintRowProps) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-foreground text-sm leading-5 font-medium">
        {title}
      </Text>
      <View className="bg-default rounded-lg px-2 py-0.5">{hint}</View>
    </View>
  )
}
