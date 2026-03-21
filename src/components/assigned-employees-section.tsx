import { SymbolView } from 'expo-symbols'
import { Button, ListGroup, Separator, useThemeColor } from 'heroui-native'
import { View } from 'react-native'

import { SectionHeader } from '@/components/section-header'
import type {
  GeneratorUserAssignment,
  OrganizationMember
} from '@/data/client/db-schema'
import { useTranslation } from '@/lib/i18n'

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
  const { t } = useTranslation()
  const foregroundColor = useThemeColor('foreground')

  return (
    <View className="gap-2">
      <SectionHeader title={t('employees.assignedEmployees')} />
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
              <Button
                size="sm"
                variant="danger-soft"
                onPress={() => onUnassign(assignment.userId)}
              >
                {t('common.remove')}
              </Button>
            </ListGroup.Item>
          </View>
        ))}
        {assignments.length === 0 ? (
          <ListGroup.Item>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle className="text-muted">
                {t('employees.noEmployeesAssigned')}
              </ListGroup.ItemTitle>
            </ListGroup.ItemContent>
          </ListGroup.Item>
        ) : null}
        {unassignedMembers.length > 0 ? (
          <>
            <Separator className="mx-4" />
            {unassignedMembers.map((member, index) => (
              <View key={member.id}>
                {index > 0 ? <Separator className="mx-4" /> : null}
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
