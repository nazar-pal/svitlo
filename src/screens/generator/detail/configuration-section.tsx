import { Text, View } from 'react-native'
import { ListGroup, Separator } from 'heroui-native'

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
      <Text className="text-muted ml-4 text-xs uppercase">Configuration</Text>
      <ListGroup>
        <ListGroup.Item>
          <ListGroup.ItemContent>
            <ListGroup.ItemTitle>Max Run Hours</ListGroup.ItemTitle>
          </ListGroup.ItemContent>
          <Text className="text-foreground text-[15px]">
            {maxConsecutiveRunHours}h
          </Text>
        </ListGroup.Item>
        <Separator className="mx-4" />
        <ListGroup.Item>
          <ListGroup.ItemContent>
            <ListGroup.ItemTitle>Rest Hours</ListGroup.ItemTitle>
          </ListGroup.ItemContent>
          <Text className="text-foreground text-[15px]">
            {requiredRestHours}h
          </Text>
        </ListGroup.Item>
        <Separator className="mx-4" />
        <ListGroup.Item>
          <ListGroup.ItemContent>
            <ListGroup.ItemTitle>Warning Threshold</ListGroup.ItemTitle>
          </ListGroup.ItemContent>
          <Text className="text-foreground text-[15px]">
            {runWarningThresholdPct}%
          </Text>
        </ListGroup.Item>
      </ListGroup>
    </View>
  )
}
