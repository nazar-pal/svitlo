import { SymbolView } from 'expo-symbols'
import { Pressable, Text, View } from 'react-native'
import { ListGroup, Separator } from 'heroui-native'
import { useCSSVariable } from 'uniwind'

import type {
  GeneratorUserAssignment,
  OrganizationMember
} from '@/data/client/db-schema'

interface AssignedEmployeesSectionProps {
  assignments: GeneratorUserAssignment[]
  unassignedMembers: OrganizationMember[]
  getUserName: (userId: string) => string
  onAssign: (userId: string) => void
  onUnassign: (userId: string) => void
}

export function AssignedEmployeesSection({
  assignments,
  unassignedMembers,
  getUserName,
  onAssign,
  onUnassign
}: AssignedEmployeesSectionProps) {
  const foregroundColor = useCSSVariable('--color-foreground') as
    | string
    | undefined

  return (
    <View className="gap-2">
      <Text className="text-muted ml-4 text-xs uppercase">
        Assigned Employees
      </Text>
      <ListGroup>
        {assignments.map((assignment, index) => (
          <View key={assignment.id}>
            {index > 0 ? <Separator className="mx-4" /> : null}
            <ListGroup.Item>
              <ListGroup.ItemPrefix>
                <SymbolView
                  name="person.fill"
                  size={18}
                  tintColor={foregroundColor}
                />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>
                  {getUserName(assignment.userId)}
                </ListGroup.ItemTitle>
              </ListGroup.ItemContent>
              <Pressable onPress={() => onUnassign(assignment.userId)}>
                <Text className="text-danger text-sm">Remove</Text>
              </Pressable>
            </ListGroup.Item>
          </View>
        ))}
        {assignments.length === 0 ? (
          <ListGroup.Item>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle className="text-muted">
                No employees assigned
              </ListGroup.ItemTitle>
            </ListGroup.ItemContent>
          </ListGroup.Item>
        ) : null}
        {unassignedMembers.length > 0 ? (
          <>
            <Separator className="mx-4" />
            {unassignedMembers.map(member => (
              <View key={member.id}>
                <ListGroup.Item onPress={() => onAssign(member.userId)}>
                  <ListGroup.ItemPrefix>
                    <SymbolView
                      name="plus.circle"
                      size={18}
                      tintColor={foregroundColor}
                    />
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>
                      {getUserName(member.userId)}
                    </ListGroup.ItemTitle>
                  </ListGroup.ItemContent>
                </ListGroup.Item>
              </View>
            ))}
          </>
        ) : null}
      </ListGroup>
    </View>
  )
}
