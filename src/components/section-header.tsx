import { Text } from 'react-native'

export function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-muted ml-4 text-xs font-semibold tracking-wide uppercase">
      {title}
    </Text>
  )
}
