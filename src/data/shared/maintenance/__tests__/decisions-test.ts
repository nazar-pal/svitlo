import { runDecisionAsync } from '@/data/shared/facts/async-adapter'

import { updateTemplate } from '../decisions'

const ADMIN = 'user-admin'
const GENERATOR = 'gen-1'
const TEMPLATE = 'tpl-1'

function makeLookup(
  map: Record<string, unknown>
): (key: string, input: unknown) => Promise<unknown> {
  return async key => map[key] ?? null
}

// updateTemplate's rule merges the existing row with the update payload before
// invoking `updateMaintenanceTemplatePolicy`. Two merge invariants are subtle
// enough to deserve direct coverage at the decision boundary:
//
//   (1) `triggerCalendarDays: null` in the payload is an *explicit clear*,
//       distinct from `undefined` (omitted). The merge must forward the null.
//   (2) An omitted companion field must fall back to the existing row's value.
//
// The integration tests cover the happy/missing-companion paths but don't
// distinguish explicit-null from omitted; a regression that swapped one for
// the other would silently break the trigger-field UX.

describe('updateTemplate decision: merge invariants', () => {
  const TEMPLATE_ROW = {
    generatorId: GENERATOR,
    triggerType: 'whichever_first',
    triggerHoursInterval: 100,
    triggerCalendarDays: 30
  }
  const ADMIN_AUTHZ = { orgAdminUserId: ADMIN, hasAssignment: false }

  it('treats explicit null triggerCalendarDays as a real value when switching to hours', async () => {
    const result = await runDecisionAsync(
      updateTemplate,
      {
        userId: ADMIN,
        templateId: TEMPLATE,
        update: { triggerType: 'hours', triggerCalendarDays: null }
      },
      makeLookup({
        'maintenanceTemplate.byId': TEMPLATE_ROW,
        'authz.generator': ADMIN_AUTHZ
      })
    )
    expect(result.ok).toBe(true)
  })

  it('carries the existing triggerCalendarDays when omitted from the payload', async () => {
    const result = await runDecisionAsync(
      updateTemplate,
      {
        userId: ADMIN,
        templateId: TEMPLATE,
        update: { triggerType: 'whichever_first', triggerHoursInterval: 200 }
      },
      makeLookup({
        'maintenanceTemplate.byId': TEMPLATE_ROW,
        'authz.generator': ADMIN_AUTHZ
      })
    )
    expect(result.ok).toBe(true)
  })

  it('carries the existing triggerHoursInterval when omitted from the payload', async () => {
    const result = await runDecisionAsync(
      updateTemplate,
      {
        userId: ADMIN,
        templateId: TEMPLATE,
        update: { triggerType: 'whichever_first', triggerCalendarDays: 60 }
      },
      makeLookup({
        'maintenanceTemplate.byId': TEMPLATE_ROW,
        'authz.generator': ADMIN_AUTHZ
      })
    )
    expect(result.ok).toBe(true)
  })

  it('skips companion-field checks when triggerType is not in the payload', async () => {
    const result = await runDecisionAsync(
      updateTemplate,
      {
        userId: ADMIN,
        templateId: TEMPLATE,
        update: { triggerHoursInterval: null }
      },
      makeLookup({
        'maintenanceTemplate.byId': TEMPLATE_ROW,
        'authz.generator': ADMIN_AUTHZ
      })
    )
    expect(result.ok).toBe(true)
  })

  it('short-circuits to TEMPLATE_NOT_FOUND without touching authz', async () => {
    const result = await runDecisionAsync(
      updateTemplate,
      {
        userId: ADMIN,
        templateId: TEMPLATE,
        update: { triggerType: 'hours', triggerHoursInterval: 100 }
      },
      makeLookup({ 'maintenanceTemplate.byId': null })
    )
    expect(result).toMatchObject({ ok: false, code: 'TEMPLATE_NOT_FOUND' })
  })
})
