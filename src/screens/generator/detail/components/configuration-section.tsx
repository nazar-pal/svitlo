import { ListGroup, Separator } from 'heroui-native'
import { Text, View } from 'react-native'

import { SectionHeader } from '@/components/section-header'

interface ConfigurationSectionProps {
  maxConsecutiveRunHours: number
  requiredRestHours: number
  runWarningThresholdPct: number
}

export function ConfigurationSection({
  maxConsecutiveRunHours,
  requiredRestHours,
  runWarningThresholdPct
}: ConfigurationSectionProps) {
  return (
    <View className="gap-2">
      <SectionHeader title="Configuration" />
      <ListGroup>
        <ListGroup.Item>
          <ListGroup.ItemContent>
            <ListGroup.ItemTitle>Max Run Hours</ListGroup.ItemTitle>
          </ListGroup.ItemContent>
          <ListGroup.ItemSuffix>
            <Text className="text-foreground text-3.75">
              {maxConsecutiveRunHours}h
            </Text>
          </ListGroup.ItemSuffix>
        </ListGroup.Item>
        <Separator className="mx-4" />
        <ListGroup.Item>
          <ListGroup.ItemContent>
            <ListGroup.ItemTitle>Rest Hours</ListGroup.ItemTitle>
          </ListGroup.ItemContent>
          <ListGroup.ItemSuffix>
            <Text className="text-foreground text-3.75">
              {requiredRestHours}h
            </Text>
          </ListGroup.ItemSuffix>
        </ListGroup.Item>
        <Separator className="mx-4" />
        <ListGroup.Item>
          <ListGroup.ItemContent>
            <ListGroup.ItemTitle>Warning Threshold</ListGroup.ItemTitle>
          </ListGroup.ItemContent>
          <ListGroup.ItemSuffix>
            <Text className="text-foreground text-3.75">
              {runWarningThresholdPct}%
            </Text>
          </ListGroup.ItemSuffix>
        </ListGroup.Item>
      </ListGroup>
    </View>
  )
}
