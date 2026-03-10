import {
  Button,
  Card,
  Description,
  Input,
  Label,
  Switch,
  TextField
} from 'heroui-native'
import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import { trpcClient } from '@/data/trpc/react'

export default function ShowcaseScreen() {
  const [email, setEmail] = useState('ios@svitlo.app')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [apiState, setApiState] = useState({
    loading: false,
    error: '',
    result: ''
  })

  async function runHealthCheck() {
    try {
      setApiState({ loading: true, error: '', result: '' })
      const data = await trpcClient.appTest.health.query()
      setApiState({
        loading: false,
        error: '',
        result: JSON.stringify(data, null, 2)
      })
    } catch (error) {
      setApiState({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to reach appTest.health.',
        result: ''
      })
    }
  }

  async function runDemoPost() {
    try {
      setApiState({ loading: true, error: '', result: '' })
      const data = await trpcClient.appTest.echo.mutate({
        feature: 'showcase',
        status: 'ok'
      })
      setApiState({
        loading: false,
        error: '',
        result: JSON.stringify(data, null, 2)
      })
    } catch (error) {
      setApiState({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to reach appTest.echo.',
        result: ''
      })
    }
  }

  async function runSessionCheck() {
    try {
      setApiState({ loading: true, error: '', result: '' })
      const data = await trpcClient.user.me.query()
      setApiState({
        loading: false,
        error: '',
        result: JSON.stringify(data, null, 2)
      })
    } catch (error) {
      setApiState({
        loading: false,
        error:
          error instanceof Error ? error.message : 'Unable to reach user.me.',
        result: ''
      })
    }
  }

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-6 px-4 pt-safe-offset-4 pb-safe-offset-6"
    >
      <View className="gap-2">
        <Text className="text-foreground text-3xl font-semibold">
          HeroUI Native Showcase
        </Text>
        <Text className="text-muted text-base leading-6">
          This screen is a visual smoke test for HeroUI Native components and
          Uniwind utility classes in the iOS app shell.
        </Text>
      </View>

      <Card>
        <Card.Body className="gap-2">
          <Card.Title>Installation checks</Card.Title>
          <Card.Description>
            The layout and spacing here come from Uniwind classes, while the
            buttons and cards are rendered by HeroUI Native.
          </Card.Description>
        </Card.Body>
        <Card.Footer className="flex-row flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </Card.Footer>
      </Card>

      <Card>
        <Card.Body className="gap-4">
          <Card.Title>Form field</Card.Title>
          <Card.Description>
            This uses HeroUI Native&apos;s text field primitives inside a screen
            laid out with Uniwind.
          </Card.Description>

          <TextField>
            <Label>Email</Label>
            <Input
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
            />
            <Description>
              Only used to confirm the component styles are loaded.
            </Description>
          </TextField>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="gap-4">
          <Card.Title>Interactive controls</Card.Title>
          <Card.Description>
            State changes here confirm the HeroUI Native provider and
            Reanimated-based controls are working.
          </Card.Description>

          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-1 gap-1">
              <Text className="text-foreground text-base font-medium">
                Push notifications
              </Text>
              <Text className="text-muted text-sm">
                {notificationsEnabled
                  ? 'Enabled for the demo account.'
                  : 'Disabled for the demo account.'}
              </Text>
            </View>

            <Switch
              className="h-8 w-14"
              isSelected={notificationsEnabled}
              onSelectedChange={setNotificationsEnabled}
            >
              <Switch.Thumb className="size-6" />
            </Switch>
          </View>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="gap-4">
          <Card.Title>tRPC API</Card.Title>
          <Card.Description>
            These actions verify that the app can talk to the tRPC API
            endpoints.
          </Card.Description>

          <View className="flex-row flex-wrap gap-3">
            <Button variant="primary" onPress={runHealthCheck}>
              appTest.health
            </Button>
            <Button variant="secondary" onPress={runDemoPost}>
              appTest.echo
            </Button>
            <Button variant="outline" onPress={runSessionCheck}>
              user.me
            </Button>
          </View>

          {apiState.loading ? (
            <Text className="text-muted text-sm">Running API request...</Text>
          ) : null}

          {apiState.error ? (
            <Text className="bg-danger/10 text-danger rounded-2xl px-4 py-3 text-sm">
              {apiState.error}
            </Text>
          ) : null}

          {apiState.result ? (
            <Text className="bg-surface-secondary text-foreground rounded-2xl px-4 py-3 font-mono text-xs leading-5">
              {apiState.result}
            </Text>
          ) : null}
        </Card.Body>
      </Card>
    </ScrollView>
  )
}
