import { NativeTabs } from 'expo-router/unstable-native-tabs'
import React from 'react'
import { useCSSVariable } from 'uniwind'

export default function AppTabs() {
  const background = useCSSVariable('--color-background') as string | undefined
  const surfaceSecondary = useCSSVariable('--color-surface-secondary') as
    | string
    | undefined
  const foreground = useCSSVariable('--color-foreground') as string | undefined

  return (
    <NativeTabs
      backgroundColor={background}
      indicatorColor={surfaceSecondary}
      labelStyle={{ selected: { color: foreground } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="safari.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="showcase">
        <NativeTabs.Trigger.Label>Showcase</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sparkles" />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
