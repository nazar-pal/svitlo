import { Text } from 'react-native'

export function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-muted mb-2 ml-1 text-xs font-semibold tracking-wide uppercase">
      {title}
    </Text>
  )
}
