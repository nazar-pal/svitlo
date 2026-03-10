import { SymbolView } from 'expo-symbols'
import { ListGroup, Separator } from 'heroui-native'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useCSSVariable } from 'uniwind'

import { AnimatedIcon } from '@/components/animated-icon'
import { authClient } from '@/lib/auth/auth-client'
import { useSignOut } from '@/lib/auth/use-sign-out'
import { useLocalUser } from '@/lib/powersync/use-local-user'

export default function HomeScreen() {
  const { data: session } = authClient.useSession()
  const handleSignOut = useSignOut()
  const localUser = useLocalUser()
  const foregroundColor = useCSSVariable('--color-foreground') as
    | string
    | undefined
  const mutedColor = useCSSVariable('--color-muted') as string | undefined

  return (
    <ScrollView
      className="bg-background flex-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pb-10 pt-6"
    >
      <View className="mx-auto w-full max-w-[600px] gap-7">
        <View className="items-center gap-4 py-4">
          <AnimatedIcon />
          <Text className="text-foreground text-center text-3xl font-bold">
            Welcome to Svitlo
          </Text>
          <Text className="text-muted max-w-[320px] text-center text-[15px] leading-[22px]">
            iOS-first product UI, powered by Expo Hosting behind the scenes.
          </Text>
        </View>

        {/* Account */}
        <View className="gap-2">
          <Text className="text-muted ml-4 text-xs uppercase">Account</Text>
          <ListGroup>
            <ListGroup.Item>
              <ListGroup.ItemPrefix>
                <SymbolView
                  name="person.fill"
                  size={20}
                  tintColor={foregroundColor}
                />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>
                  {localUser?.name ?? 'Unknown'}
                </ListGroup.ItemTitle>
                <ListGroup.ItemDescription>
                  {session?.user.email ?? 'Unknown'}
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
            </ListGroup.Item>
          </ListGroup>
        </View>

        {/* Quick Links */}
        <View className="gap-2">
          <Text className="text-muted ml-4 text-xs uppercase">Quick Links</Text>
          <ListGroup>
            <ListGroup.Item>
              <ListGroup.ItemPrefix>
                <SymbolView
                  name="sparkles"
                  size={20}
                  tintColor={foregroundColor}
                />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>Showcase</ListGroup.ItemTitle>
                <ListGroup.ItemDescription>
                  Components and patterns
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
              <ListGroup.ItemSuffix
                iconProps={{ size: 14, color: mutedColor }}
              />
            </ListGroup.Item>
            <Separator className="mx-4" />
            <ListGroup.Item>
              <ListGroup.ItemPrefix>
                <SymbolView
                  name="globe"
                  size={20}
                  tintColor={foregroundColor}
                />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>Privacy Policy</ListGroup.ItemTitle>
                <ListGroup.ItemDescription>
                  Hosted via Expo
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
              <ListGroup.ItemSuffix
                iconProps={{ size: 14, color: mutedColor }}
              />
            </ListGroup.Item>
          </ListGroup>
        </View>

        {/* Sign Out */}
        <ListGroup>
          <Pressable
            onPress={handleSignOut}
            className="items-center justify-center py-3"
          >
            <Text className="text-danger text-[17px] font-normal">
              Sign Out
            </Text>
          </Pressable>
        </ListGroup>
      </View>
    </ScrollView>
  )
}
