import { ScrollView, Text, View } from 'react-native'

import { formatDate, useTranslation } from '@/lib/i18n'

const contactEmail = 'ua.nazar.palamarchuk.ua@gmail.com'

export default function PrivacyPolicyPage() {
  const { t } = useTranslation()

  const sections = [
    {
      title: t('privacy.whatWeCollectTitle'),
      body: t('privacy.whatWeCollectBody')
    },
    {
      title: t('privacy.whatWeDoNotCollectTitle'),
      body: t('privacy.whatWeDoNotCollectBody')
    },
    {
      title: t('privacy.dataSharingTitle'),
      body: t('privacy.dataSharingBody')
    },
    {
      title: t('privacy.dataStorageTitle'),
      body: t('privacy.dataStorageBody')
    },
    {
      title: t('privacy.dataDeletionTitle'),
      body: t('privacy.dataDeletionBody', { email: contactEmail })
    },
    { title: t('privacy.childrenTitle'), body: t('privacy.childrenBody') },
    { title: t('privacy.changesTitle'), body: t('privacy.changesBody') },
    {
      title: t('privacy.contactTitle'),
      body: t('privacy.contactBody', { email: contactEmail })
    }
  ]

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="px-6 py-16"
    >
      <View className="mx-auto w-full max-w-180 gap-8">
        <View className="gap-3">
          <Text className="text-center text-4xl font-bold tracking-tight text-gray-900">
            {t('privacy.title')}
          </Text>
          <Text className="text-center text-lg text-gray-500">
            {t('privacy.subtitle')}
          </Text>
          <Text className="text-center text-sm text-gray-400">
            {t('privacy.effectiveDate', {
              date: formatDate(new Date(2026, 2, 14), 'PP')
            })}
          </Text>
        </View>

        <View className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
          <Text className="text-base leading-7 text-gray-600">
            {t('privacy.intro')}
          </Text>
        </View>

        {sections.map((section, i) => (
          <View key={i} className="gap-2">
            <Text className="px-1 text-xl font-semibold text-gray-900">
              {section.title}
            </Text>
            <View className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <Text className="text-base leading-7 text-gray-600">
                {section.body}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}
