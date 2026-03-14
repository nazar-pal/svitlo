import { Card } from 'heroui-native'
import { ScrollView, Text, View } from 'react-native'

const effectiveDate = 'March 14, 2026'
const contactEmail = 'svitlo@nazarii.dev'

const sections = [
  {
    title: 'What We Collect',
    body: `When you sign in with Apple, we receive your name and email address (or Apple's private relay email if you choose to hide your address). We use this information solely to create and identify your account within the app.\n\nThe app stores the following data that you create: organizations, generator records, session logs (start/stop times), maintenance templates, and maintenance records. This data is stored on your device and synchronized to our server so it is available across devices and to other members of your organization.`
  },
  {
    title: 'What We Do NOT Collect',
    body: 'We do not collect analytics, usage metrics, advertising identifiers, location data, or any device sensor data. We do not use any third-party analytics or tracking SDKs. We do not display advertisements.'
  },
  {
    title: 'Data Sharing',
    body: 'We do not sell, rent, or share your personal data with any third party. Your generator and maintenance data is visible only to members of the same organization within the app, as determined by the organization administrator.'
  },
  {
    title: 'Data Storage & Security',
    body: 'Your data is stored locally on your device using SQLite and synchronized to a PostgreSQL database hosted by Neon (neon.tech). Data in transit is encrypted via HTTPS/TLS. Authentication is handled through Apple\u2019s Sign in with Apple service via our server.'
  },
  {
    title: 'Data Deletion',
    body: `You may delete your account and all associated data by contacting us at ${contactEmail}. Upon request, we will delete your account and personal data from our servers within 30 days.`
  },
  {
    title: "Children's Privacy",
    body: 'Svitlo is not directed at children under 13. We do not knowingly collect data from children.'
  },
  {
    title: 'Changes to This Policy',
    body: 'We may update this policy from time to time. The updated version will be posted at this URL with a new effective date.'
  },
  {
    title: 'Contact',
    body: `If you have questions about this policy, contact us at ${contactEmail}.`
  }
] as const

export default function PrivacyPolicyPage() {
  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="px-6 py-10"
    >
      <View className="mx-auto w-full max-w-[720px] gap-8">
        <View className="gap-3">
          <Text className="text-foreground text-center text-4xl font-bold tracking-tight">
            Privacy Policy
          </Text>
          <Text className="text-muted-foreground text-center text-lg">
            Svitlo — Generator Tracking & Maintenance
          </Text>
          <Text className="text-muted text-center text-sm">
            Effective date: {effectiveDate}
          </Text>
        </View>

        <Card>
          <Card.Body>
            <Card.Description className="text-foreground/80 text-base leading-7">
              Svitlo (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;the
              app&rdquo;) is a mobile application for tracking power generator
              usage and maintenance. This policy explains what data we collect
              and how we use it.
            </Card.Description>
          </Card.Body>
        </Card>

        {sections.map(section => (
          <View key={section.title} className="gap-2">
            <Text className="text-foreground px-1 text-xl font-semibold">
              {section.title}
            </Text>
            <Card>
              <Card.Body>
                <Card.Description className="text-foreground/70 text-base leading-7">
                  {section.body}
                </Card.Description>
              </Card.Body>
            </Card>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}
