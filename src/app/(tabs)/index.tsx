import * as Device from 'expo-device'
import { Card } from 'heroui-native'
import { ScrollView, Text, View } from 'react-native'

import { AnimatedIcon } from '@/components/animated-icon'
import { HintRow } from '@/components/hint-row'

function getDevMenuHint() {
  if (Device.isDevice) {
    return (
      <Text className="text-foreground text-sm leading-5 font-medium">
        shake device or press{' '}
        <Text className="text-foreground font-mono text-xs font-medium">m</Text>{' '}
        in terminal
      </Text>
    )
  }
  return (
    <Text className="text-foreground text-sm leading-5 font-medium">
      press{' '}
      <Text className="text-foreground font-mono text-xs font-medium">
        cmd+d
      </Text>
    </Text>
  )
}

export default function HomeScreen() {
  return (
    <ScrollView
      className="bg-background flex-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-6 py-10"
    >
      <View className="mx-auto w-full max-w-[800px] gap-8">
        <View className="items-center gap-5 py-6">
          <AnimatedIcon />
          <Text className="text-foreground text-center text-5xl leading-[52px] font-semibold">
            Welcome to&nbsp;Svitlo
          </Text>
          <Text className="text-muted max-w-[420px] text-center text-base leading-6 font-medium">
            The product UI remains iOS-first, while Expo Hosting powers the
            privacy page and API routes behind the scenes.
          </Text>
        </View>

        <Text className="text-foreground font-mono text-xs font-medium uppercase">
          native app shell
        </Text>

        <Card className="w-full">
          <Card.Body className="gap-3">
            <HintRow
              title="Showcase screen"
              hint={
                <Text className="text-muted font-mono text-xs font-medium">
                  src/app/(tabs)/showcase.tsx
                </Text>
              }
            />
            <HintRow title="Dev tools" hint={getDevMenuHint()} />
            <HintRow
              title="Hosted page"
              hint={
                <Text className="text-muted font-mono text-xs font-medium">
                  src/app/privacy-policy.tsx
                </Text>
              }
            />
          </Card.Body>
        </Card>
      </View>
    </ScrollView>
  )
}
