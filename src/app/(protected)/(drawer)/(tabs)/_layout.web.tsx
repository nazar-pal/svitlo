import { type Href, Link } from 'expo-router'
import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps
} from 'expo-router/ui'
import React from 'react'
import { Pressable, Text, View } from 'react-native'

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot className="h-full" />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href={'/' as Href} asChild>
            <TabButton>Dashboard</TabButton>
          </TabTrigger>
          <TabTrigger name="generators" href={'/generators' as Href} asChild>
            <TabButton>Generators</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton>Settings</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  )
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} className="active:opacity-70">
      <View
        className={`rounded-xl px-3 py-1 ${isFocused ? 'bg-default' : 'bg-surface-secondary'}`}
      >
        <Text
          className={`text-sm leading-5 font-medium ${isFocused ? 'text-foreground' : 'text-muted'}`}
        >
          {children}
        </Text>
      </View>
    </Pressable>
  )
}

function CustomTabList(props: TabListProps) {
  return (
    <View
      {...props}
      className="absolute w-full flex-row items-center justify-center p-4"
    >
      <View className="bg-surface-secondary w-full max-w-[800px] flex-row items-center gap-2 rounded-[32px] px-8 py-2">
        <Text className="text-foreground mr-auto text-sm leading-5 font-bold">
          Svitlo
        </Text>

        {props.children}

        <Link href={'/privacy-policy' as Href} asChild>
          <Pressable className="ml-4 flex-row items-center justify-center gap-1 active:opacity-70">
            <Text className="text-foreground text-sm leading-[30px]">
              Privacy Policy ↗
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  )
}
