import * as Haptics from 'expo-haptics'

export const selection = () => Haptics.selectionAsync()

export const impactLight = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

export const impactMedium = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

export const notifySuccess = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

export const notifyWarning = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
