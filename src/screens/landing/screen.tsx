import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native'

const appStoreUrl = 'https://apps.apple.com/app/id6743439804'

const features = [
  {
    icon: '\u26A1',
    title: 'One-Tap Sessions',
    description:
      'Start and stop generator sessions with one tap. Track total runtime automatically.'
  },
  {
    icon: '\uD83D\uDD27',
    title: 'Smart Maintenance',
    description:
      'Schedule maintenance by runtime hours or calendar dates. Never miss a service interval.'
  },
  {
    icon: '\u2728',
    title: 'AI-Powered Suggestions',
    description:
      'Get AI-generated maintenance templates tailored to your generator type and usage patterns.'
  },
  {
    icon: '\uD83D\uDC65',
    title: 'Team Management',
    description:
      'Create organizations, invite team members, and control access with role-based permissions.'
  },
  {
    icon: '\uD83D\uDCF6',
    title: 'Works Offline',
    description:
      'All data is stored locally and syncs automatically when you\u2019re back online.'
  },
  {
    icon: '\u23F1\uFE0F',
    title: 'Run Limits & Rest',
    description:
      'Set maximum run times and required rest periods. Get warned before limits are reached.'
  }
] as const

const steps = [
  {
    number: '1',
    title: 'Add Your Generators',
    description:
      'Set up generators with run limits, rest periods, and maintenance schedules.'
  },
  {
    number: '2',
    title: 'Track Sessions',
    description: 'Start and stop sessions to log runtime hours automatically.'
  },
  {
    number: '3',
    title: 'Stay on Schedule',
    description:
      'Get maintenance reminders based on hours or calendar intervals.'
  }
] as const

function AppStoreButton() {
  return (
    <Pressable
      onPress={() => Linking.openURL(appStoreUrl)}
      className="flex-row items-center gap-3 rounded-xl bg-black px-6 py-3"
    >
      <Text className="text-2xl text-white">&#xF8FF;</Text>
      <View>
        <Text className="text-xs text-white/80">Download on the</Text>
        <Text className="text-lg font-semibold text-white">App Store</Text>
      </View>
    </Pressable>
  )
}

export default function LandingScreen() {
  return (
    <ScrollView className="flex-1 bg-white">
      {/* Hero */}
      <View className="items-center px-6 pt-24 pb-20">
        <Image
          source={require('../../../assets/images/icon.png')}
          className="mb-8 h-28 w-28 rounded-[28px] shadow-lg"
        />
        <Text className="mb-3 text-center text-5xl font-bold tracking-tight text-gray-900">
          Svitlo
        </Text>
        <Text className="mb-10 max-w-[520px] text-center text-xl leading-8 text-gray-500">
          Track, maintain, and manage your power generators {'\u2014'} all from
          one app.
        </Text>
        <AppStoreButton />
      </View>

      {/* Features */}
      <View className="border-t border-gray-100 bg-gray-50 px-6 py-20">
        <View className="mx-auto w-full max-w-[1080px]">
          <Text className="mb-3 text-center text-3xl font-bold tracking-tight text-gray-900">
            Everything You Need
          </Text>
          <Text className="mb-12 text-center text-lg text-gray-500">
            From session tracking to AI-powered maintenance {'\u2014'} all in
            one place.
          </Text>

          <View className="flex-row flex-wrap justify-center gap-5">
            {features.map(feature => (
              <View
                key={feature.title}
                className="min-w-[300px] flex-1 basis-[30%] rounded-2xl border border-gray-200 bg-white p-6"
              >
                <Text className="mb-3 text-3xl">{feature.icon}</Text>
                <Text className="mb-2 text-lg font-semibold text-gray-900">
                  {feature.title}
                </Text>
                <Text className="text-base leading-6 text-gray-500">
                  {feature.description}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* How It Works */}
      <View className="border-t border-gray-100 px-6 py-20">
        <View className="mx-auto w-full max-w-[1080px]">
          <Text className="mb-12 text-center text-3xl font-bold tracking-tight text-gray-900">
            How It Works
          </Text>

          <View className="flex-row flex-wrap justify-center gap-10">
            {steps.map(step => (
              <View
                key={step.number}
                className="min-w-[240px] flex-1 basis-[28%] items-center gap-4"
              >
                <View className="h-14 w-14 items-center justify-center rounded-full bg-[#208AEF]">
                  <Text className="text-xl font-bold text-white">
                    {step.number}
                  </Text>
                </View>
                <Text className="text-xl font-semibold text-gray-900">
                  {step.title}
                </Text>
                <Text className="text-center text-base leading-6 text-gray-500">
                  {step.description}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* AI Section */}
      <View className="items-center bg-[#208AEF] px-6 py-20">
        <View className="mx-auto max-w-[640px] items-center">
          <Text className="mb-3 text-3xl font-bold text-white">
            Powered by AI
          </Text>
          <Text className="mb-6 text-center text-lg leading-8 text-white/90">
            Svitlo uses AI to generate maintenance templates tailored to your
            generator{'\u2019'}s make, model, and fuel type. It also helps you
            set up new generators faster by suggesting run limits and rest
            periods based on manufacturer recommendations.
          </Text>
        </View>
      </View>

      {/* Footer CTA */}
      <View className="items-center bg-gray-900 px-6 py-20">
        <Text className="mb-3 text-3xl font-bold text-white">
          Ready to Get Started?
        </Text>
        <Text className="mb-8 max-w-[480px] text-center text-lg text-gray-400">
          Download Svitlo and take control of your generator maintenance today.
        </Text>
        <AppStoreButton />
        <Pressable
          onPress={() => Linking.openURL('/privacy-policy')}
          className="mt-8"
        >
          <Text className="text-sm text-gray-500 underline">
            Privacy Policy
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}
