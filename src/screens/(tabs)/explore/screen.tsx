import { SymbolView } from 'expo-symbols'
import { Accordion } from 'heroui-native'
import React from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCSSVariable } from 'uniwind'

import { Image } from '@/components/styled'
import { ExternalLink } from '@/components/external-link'

export default function ExploreScreen() {
  const safeAreaInsets = useSafeAreaInsets()
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + 66
  }
  const foreground = useCSSVariable('--color-foreground') as string | undefined

  return (
    <ScrollView
      className="bg-background flex-1"
      contentInset={insets}
      contentContainerClassName="justify-center flex-row"
    >
      <View className="w-full max-w-[800px] grow px-6">
        <View className="items-center gap-4 px-6 pt-16 pb-6">
          <Text className="text-foreground text-[32px] leading-[44px] font-semibold">
            Explore
          </Text>
          <Text className="text-muted text-center text-base leading-6 font-medium">
            Notes about the app shell, Expo Router structure, and the new
            server-backed web surface.
          </Text>

          <ExternalLink
            href="https://docs.expo.dev/router/introduction"
            asChild
          >
            <Pressable className="active:opacity-70">
              <View className="bg-surface-secondary flex-row items-center justify-center gap-1 rounded-[32px] px-6 py-2">
                <Text className="text-foreground text-sm leading-[30px]">
                  Expo Router docs
                </Text>
                <SymbolView
                  tintColor={foreground}
                  name="arrow.up.right.square"
                  size={12}
                />
              </View>
            </Pressable>
          </ExternalLink>
        </View>

        <Accordion selectionMode="multiple" variant="surface">
          <Accordion.Item value="routing">
            <Accordion.Trigger>
              <Text className="text-foreground flex-1 text-sm leading-5 font-medium">
                Routing structure
              </Text>
              <Accordion.Indicator />
            </Accordion.Trigger>
            <Accordion.Content className="gap-3">
              <Text className="text-foreground text-sm leading-5 font-medium">
                Mobile tabs live in{' '}
                <Text className="text-foreground font-mono text-xs font-medium">
                  src/app/(protected)/(tabs)
                </Text>
                , while the public privacy page and API routes live outside the
                protected app shell.
              </Text>
              <Text className="text-foreground text-sm leading-5 font-medium">
                That lets hosted public pages avoid inheriting the native tab
                shell.
              </Text>
            </Accordion.Content>
          </Accordion.Item>

          <Accordion.Item value="hosting">
            <Accordion.Trigger>
              <Text className="text-foreground flex-1 text-sm leading-5 font-medium">
                Expo Hosting
              </Text>
              <Accordion.Indicator />
            </Accordion.Trigger>
            <Accordion.Content className="gap-3">
              <Text className="text-foreground text-sm leading-5 font-medium">
                The project keeps web support enabled for Expo Hosting and Expo
                API Routes, even though the product UI remains focused on iOS.
              </Text>
              <ExternalLink href="https://docs.expo.dev/eas/hosting/introduction/">
                <Text className="text-link text-sm leading-[30px]">
                  EAS Hosting overview
                </Text>
              </ExternalLink>
            </Accordion.Content>
          </Accordion.Item>

          <Accordion.Item value="heroui">
            <Accordion.Trigger>
              <Text className="text-foreground flex-1 text-sm leading-5 font-medium">
                HeroUI Native + Uniwind
              </Text>
              <Accordion.Indicator />
            </Accordion.Trigger>
            <Accordion.Content className="gap-3">
              <Text className="text-foreground text-sm leading-5 font-medium">
                The showcase tab demonstrates the installed HeroUI Native
                components, Uniwind utility classes, and API route smoke tests
                in one place.
              </Text>
              <ExternalLink href="https://v3.heroui.com/docs/native/getting-started/quick-start">
                <Text className="text-link text-sm leading-[30px]">
                  HeroUI Native quick start
                </Text>
              </ExternalLink>
            </Accordion.Content>
          </Accordion.Item>

          <Accordion.Item value="images">
            <Accordion.Trigger>
              <Text className="text-foreground flex-1 text-sm leading-5 font-medium">
                Images
              </Text>
              <Accordion.Indicator />
            </Accordion.Trigger>
            <Accordion.Content className="gap-3">
              <Text className="text-foreground text-sm leading-5 font-medium">
                Static image resolution still works with the usual{' '}
                <Text className="text-foreground font-mono text-xs font-medium">
                  @2x
                </Text>{' '}
                and{' '}
                <Text className="text-foreground font-mono text-xs font-medium">
                  @3x
                </Text>{' '}
                file suffixes.
              </Text>
              <Image
                source={require('@/assets/images/react-logo.png')}
                className="size-[100px] self-center"
              />
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </View>
    </ScrollView>
  )
}
