import { Host, Button as SwiftButton } from '@expo/ui/swift-ui'
import { font, labelStyle } from '@expo/ui/swift-ui/modifiers'
import { Stack, useRouter } from 'expo-router'
import { parseISO } from 'date-fns'
import { SymbolView } from 'expo-symbols'
import { ScrollView, Text, View } from 'react-native'
import { ListGroup, Separator, Surface, useThemeColor } from 'heroui-native'

import {
  getGenerator,
  getAllOrganizations,
  getGeneratorSessions,
  getMaintenanceRecords,
  getMaintenanceTemplates
} from '@/data/client/queries'
import { formatDate, useTranslation } from '@/lib/i18n'
import { useAuthedParams } from '@/lib/hooks/use-authed-params'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import {
  computeAllMaintenanceItems,
  formatMaintenanceLabel,
  formatScheduleLabel
} from '@/lib/maintenance/due'

export default function MaintenanceScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const ctx = useAuthedParams(['id'])
  const [mutedColor, dangerColor, warningColor, successColor] = useThemeColor([
    'muted',
    'danger',
    'warning',
    'success'
  ])

  const { data: gens } = useDrizzleQuery(
    ctx ? getGenerator(ctx.params.id) : undefined
  )
  const generator = gens[0]

  const { data: templates } = useDrizzleQuery(
    ctx ? getMaintenanceTemplates(ctx.params.id) : undefined
  )

  const { data: records } = useDrizzleQuery(
    ctx ? getMaintenanceRecords(ctx.params.id) : undefined
  )

  const { data: sessions } = useDrizzleQuery(
    ctx ? getGeneratorSessions(ctx.params.id) : undefined
  )

  const { data: allOrgs } = useDrizzleQuery(getAllOrganizations())

  if (!ctx || !generator) return null
  const {
    userId,
    params: { id: generatorId }
  } = ctx

  const org = allOrgs.find(o => o.id === generator.organizationId)
  const isAdmin = org?.adminUserId === userId

  const itemInfoMap = new Map(
    computeAllMaintenanceItems(templates, records, sessions).map(item => [
      item.templateId,
      item
    ])
  )

  function getLastRecordForTemplate(templateId: string) {
    return records.find(r => r.templateId === templateId)
  }

  function getIconColor(templateId: string, hasRecord: boolean) {
    const info = itemInfoMap.get(templateId)
    if (!info) return mutedColor
    if (info.urgency === 'overdue') return dangerColor
    if (info.urgency === 'due_soon') return warningColor
    if (hasRecord) return successColor
    return mutedColor
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pt-6 pb-6"
    >
      <Stack.Screen
        options={{
          title: t('tabs.maintenance'),
          headerRight: isAdmin
            ? () => (
                <Host matchContents>
                  <SwiftButton
                    testID="gen-maintenance-new-task"
                    label={t('screens.newTask')}
                    systemImage="plus"
                    onPress={() =>
                      router.push(`/generator/${generatorId}/create-template`)
                    }
                    modifiers={[labelStyle('iconOnly'), font({ size: 20 })]}
                  />
                </Host>
              )
            : undefined
        }}
      />

      {templates.length === 0 ? (
        <Surface
          testID="gen-maintenance-empty"
          variant="secondary"
          className="items-center py-6"
        >
          <Text className="text-muted text-sm">
            {t('maintenanceTemplate.noTemplates')}
          </Text>
        </Surface>
      ) : (
        <ListGroup>
          {templates.map((template, index) => {
            const lastRecord = getLastRecordForTemplate(template.id)
            const itemInfo = itemInfoMap.get(template.id)
            const iconColor = getIconColor(template.id, !!lastRecord)
            return (
              <View key={template.id}>
                {index > 0 ? <Separator className="mx-4" /> : null}
                <ListGroup.Item
                  onPress={() =>
                    router.push(
                      `/generator/${generatorId}/template-details?templateId=${template.id}`
                    )
                  }
                >
                  <ListGroup.ItemPrefix>
                    <SymbolView
                      name="wrench.fill"
                      size={18}
                      tintColor={iconColor}
                    />
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>
                      {template.taskName}
                    </ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>
                      {formatScheduleLabel(template)}
                      {lastRecord
                        ? ' · ' +
                          t('maintenanceTemplate.last', {
                            date: formatDate(
                              parseISO(lastRecord.performedAt),
                              'PP'
                            )
                          })
                        : null}
                    </ListGroup.ItemDescription>
                    {!lastRecord ? (
                      <Text className="text-warning text-xs">
                        {t('maintenanceTemplate.neverPerformed')}
                      </Text>
                    ) : itemInfo && itemInfo.urgency !== 'ok' ? (
                      <Text
                        className={`text-xs ${itemInfo.urgency === 'overdue' ? 'text-danger' : 'text-warning'}`}
                      >
                        {formatMaintenanceLabel(itemInfo)}
                      </Text>
                    ) : null}
                  </ListGroup.ItemContent>
                  <ListGroup.ItemSuffix
                    iconProps={{ size: 14, color: mutedColor }}
                  />
                </ListGroup.Item>
              </View>
            )
          })}
        </ListGroup>
      )}
    </ScrollView>
  )
}
