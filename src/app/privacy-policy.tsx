import { Card } from 'heroui-native'
import { ScrollView, Text, View } from 'react-native'

const updatedAt = 'March 7, 2026'
const sections = [
  {
    title: 'Overview',
    body: "Svitlo is an iOS-focused mobile application. This hosted page exists so we can publish our privacy policy through Expo Hosting alongside the project's API routes."
  },
  {
    title: 'Information We Use',
    body: 'We may process account details, app usage data, diagnostics, and any information you intentionally provide while using the service.'
  },
  {
    title: 'How To Contact Us',
    body: 'Replace this placeholder content with your production policy details and support contact information before deployment.'
  }
] as const

export default function PrivacyPolicyPage() {
  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="px-6 py-8"
    >
      <View className="mx-auto w-full max-w-[800px] gap-6">
        <Text className="text-foreground text-center text-4xl font-semibold">
          Privacy Policy
        </Text>
        <Text className="text-muted text-center text-base">
          Svitlo privacy policy for the hosted Expo page. Last updated{' '}
          {updatedAt}.
        </Text>

        {sections.map(section => (
          <Card key={section.title}>
            <Card.Body className="gap-3">
              <Card.Title>{section.title}</Card.Title>
              <Card.Description className="text-base leading-6">
                {section.body}
              </Card.Description>
            </Card.Body>
          </Card>
        ))}
      </View>
    </ScrollView>
  )
}
