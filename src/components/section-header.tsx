import { Text } from 'react-native'

interface SectionHeaderProps {
  title: string
  testID?: string
}

export function SectionHeader({ title, testID }: SectionHeaderProps) {
  return (
    <Text
      testID={testID}
      className="text-muted ml-4 text-xs font-semibold tracking-wide uppercase"
    >
      {title}
    </Text>
  )
}
