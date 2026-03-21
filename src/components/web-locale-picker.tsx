import { Pressable, Text, View } from 'react-native'

import { type LocaleChoice, useTranslation } from '@/lib/i18n'

const LOCALES: { value: LocaleChoice; label: string; nativeName: string }[] = [
  { value: 'en', label: 'EN', nativeName: 'English' },
  { value: 'uk', label: 'UK', nativeName: 'Українська' },
  { value: 'auto', label: 'Auto', nativeName: 'Auto' }
]

export function WebLocalePicker() {
  const { choice, setLocaleChoice } = useTranslation()

  return (
    <View className="fixed top-4 right-4 z-50 flex-row overflow-hidden rounded-full bg-white shadow-md">
      {LOCALES.map(l => (
        <Pressable
          key={l.value}
          onPress={() => setLocaleChoice(l.value)}
          accessibilityRole="button"
          accessibilityLabel={l.nativeName}
          className={`px-3 py-1.5 ${choice === l.value ? 'bg-black/10' : ''}`}
        >
          <Text
            className={`text-xs font-semibold ${choice === l.value ? 'text-gray-900' : 'text-gray-400'}`}
          >
            {l.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}
