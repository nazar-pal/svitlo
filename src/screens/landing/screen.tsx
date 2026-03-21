import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native'

import { useTranslation } from '@/lib/i18n'

const appStoreUrl = 'https://apps.apple.com/app/id6743439804'

function AppStoreButton() {
  const { t } = useTranslation()

  return (
    <Pressable
      onPress={() => Linking.openURL(appStoreUrl)}
      className="flex-row items-center gap-3 rounded-xl bg-black px-6 py-3"
    >
      <Text className="text-2xl text-white">&#xF8FF;</Text>
      <View>
        <Text className="text-xs text-white/80">{t('landing.downloadOn')}</Text>
        <Text className="text-lg font-semibold text-white">
          {t('landing.appStore')}
        </Text>
      </View>
    </Pressable>
  )
}

const FEATURES = [
  {
    icon: '\u26A1',
    titleKey: 'landing.feature1Title',
    descKey: 'landing.feature1Desc'
  },
  {
    icon: '\uD83D\uDD27',
    titleKey: 'landing.feature2Title',
    descKey: 'landing.feature2Desc'
  },
  {
    icon: '\u2728',
    titleKey: 'landing.feature3Title',
    descKey: 'landing.feature3Desc'
  },
  {
    icon: '\uD83D\uDC65',
    titleKey: 'landing.feature4Title',
    descKey: 'landing.feature4Desc'
  },
  {
    icon: '\uD83D\uDCF6',
    titleKey: 'landing.feature5Title',
    descKey: 'landing.feature5Desc'
  },
  {
    icon: '\u23F1\uFE0F',
    titleKey: 'landing.feature6Title',
    descKey: 'landing.feature6Desc'
  }
] as const

const STEPS = [
  { number: '1', titleKey: 'landing.step1Title', descKey: 'landing.step1Desc' },
  { number: '2', titleKey: 'landing.step2Title', descKey: 'landing.step2Desc' },
  { number: '3', titleKey: 'landing.step3Title', descKey: 'landing.step3Desc' }
] as const

export default function LandingScreen() {
  const { t } = useTranslation()

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Hero */}
      <View className="items-center px-6 pt-24 pb-20">
        <Image
          source={require('../../../assets/images/icon.png')}
          className="rounded-7 mb-8 h-28 w-28 shadow-lg"
        />
        <Text className="mb-3 text-center text-5xl font-bold tracking-tight text-gray-900">
          Svitlo
        </Text>
        <Text className="mb-10 max-w-130 text-center text-xl leading-8 text-gray-500">
          {t('landing.tagline')}
        </Text>
        <AppStoreButton />
      </View>

      {/* Features */}
      <View className="border-t border-gray-100 bg-gray-50 px-6 py-20">
        <View className="mx-auto w-full max-w-270">
          <Text className="mb-3 text-center text-3xl font-bold tracking-tight text-gray-900">
            {t('landing.featuresTitle')}
          </Text>
          <Text className="mb-12 text-center text-lg text-gray-500">
            {t('landing.featuresSubtitle')}
          </Text>

          <View className="flex-row flex-wrap justify-center gap-5">
            {FEATURES.map(f => (
              <View
                key={f.titleKey}
                className="min-w-75 flex-1 basis-[30%] rounded-2xl border border-gray-200 bg-white p-6"
              >
                <Text className="mb-3 text-3xl">{f.icon}</Text>
                <Text className="mb-2 text-lg font-semibold text-gray-900">
                  {t(f.titleKey)}
                </Text>
                <Text className="text-base leading-6 text-gray-500">
                  {t(f.descKey)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* How It Works */}
      <View className="border-t border-gray-100 px-6 py-20">
        <View className="mx-auto w-full max-w-270">
          <Text className="mb-12 text-center text-3xl font-bold tracking-tight text-gray-900">
            {t('landing.howItWorksTitle')}
          </Text>

          <View className="flex-row flex-wrap justify-center gap-10">
            {STEPS.map(s => (
              <View
                key={s.number}
                className="min-w-60 flex-1 basis-[28%] items-center gap-4"
              >
                <View className="h-14 w-14 items-center justify-center rounded-full bg-[#208AEF]">
                  <Text className="text-xl font-bold text-white">
                    {s.number}
                  </Text>
                </View>
                <Text className="text-xl font-semibold text-gray-900">
                  {t(s.titleKey)}
                </Text>
                <Text className="text-center text-base leading-6 text-gray-500">
                  {t(s.descKey)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* AI Section */}
      <View className="items-center bg-[#208AEF] px-6 py-20">
        <View className="mx-auto max-w-160 items-center">
          <Text className="mb-3 text-3xl font-bold text-white">
            {t('landing.aiTitle')}
          </Text>
          <Text className="mb-6 text-center text-lg leading-8 text-white/90">
            {t('landing.aiDesc')}
          </Text>
        </View>
      </View>

      {/* Footer CTA */}
      <View className="items-center bg-gray-900 px-6 py-20">
        <Text className="mb-3 text-3xl font-bold text-white">
          {t('landing.ctaTitle')}
        </Text>
        <Text className="mb-8 max-w-120 text-center text-lg text-gray-400">
          {t('landing.ctaDesc')}
        </Text>
        <AppStoreButton />
        <Pressable
          onPress={() => Linking.openURL('/privacy-policy')}
          className="mt-8"
        >
          <Text className="text-sm text-gray-500 underline">
            {t('auth.privacyPolicy')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}
