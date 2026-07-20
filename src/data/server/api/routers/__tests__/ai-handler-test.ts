// These tests cross the `suggestMaintenancePlan` procedure interface, exercising
// the handler body itself — locale prompt assembly, the generate/fallback-on-throw
// wiring, and the repairTasks + maintenanceSuggestionSchema.parse seam. The sibling
// ai-repair-test / ai-schema-test files reach *past* the interface to the leaf
// helpers; none of them ever build the handler closure.
//
// @orpc is ESM-only and can't be require()d in Jest's CJS runtime, so the oRPC
// builder is shimmed: `protectedProcedure.input().output().handler(fn)` returns
// `fn`, exposing the real handler from ai.ts for direct invocation. (The existing
// AI tests shim `handler: () => ({})`, which discards the handler entirely.)
jest.mock('../../orpc', () => {
  const procedure = {
    input: () => procedure,
    output: () => procedure,
    handler: (fn: unknown) => fn
  }
  return { protectedProcedure: procedure, publicProcedure: procedure }
})

jest.mock('@/data/server/ai/maintenance-agent', () => ({
  maintenanceAgent: { generate: jest.fn() }
}))

import { maintenanceAgent } from '@/data/server/ai/maintenance-agent'
import { aiRouter } from '../ai'
import type { MaintenanceSuggestion } from '@/data/shared/maintenance-suggestion'

// @mastra's generate type is too complex to assign mock results against, so the
// mock is created inside the factory above and retrieved here as a plain jest.Mock.
const mockGenerate = maintenanceAgent.generate as unknown as jest.Mock

interface SuggestInput {
  generatorModel: string
  description?: string
  locale?: 'en' | 'uk'
}

// The shimmed builder returns the raw handler; cast to its call signature.
const suggestMaintenancePlan =
  aiRouter.suggestMaintenancePlan as unknown as (args: {
    input: SuggestInput
  }) => Promise<MaintenanceSuggestion>

function rawTask(
  triggerType: 'hours' | 'calendar' | 'whichever_first',
  hours: number | null,
  days: number | null
) {
  return {
    taskName: 'Oil change',
    description: 'Change oil',
    triggerType,
    triggerHoursInterval: hours,
    triggerCalendarDays: days,
    isOneTime: false
  }
}

function rawSuggestion(overrides: Record<string, unknown> = {}) {
  return {
    maxConsecutiveRunHours: 8,
    requiredRestHours: 4,
    tasks: [rawTask('hours', 100, null)],
    sources: ['https://example.com'],
    modelInfo: 'Honda EU2200i manual',
    isGeneric: false,
    ...overrides
  }
}

let consoleErrorSpy: jest.SpyInstance

beforeEach(() => {
  mockGenerate.mockReset()
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  consoleErrorSpy.mockRestore()
})

describe('suggestMaintenancePlan handler — prompt assembly', () => {
  it('builds an English prompt with no locale block by default', async () => {
    mockGenerate.mockResolvedValue({ object: rawSuggestion() })

    await suggestMaintenancePlan({
      input: { generatorModel: 'Honda EU2200i', locale: 'en' }
    })

    const prompt = mockGenerate.mock.calls[0][0]
    expect(prompt).toContain('Generator: Honda EU2200i')
    expect(prompt).not.toContain('OUTPUT LANGUAGE')
  })

  it('includes the description line when provided', async () => {
    mockGenerate.mockResolvedValue({ object: rawSuggestion() })

    await suggestMaintenancePlan({
      input: {
        generatorModel: 'Honda EU2200i',
        description: 'inverter generator',
        locale: 'en'
      }
    })

    const prompt = mockGenerate.mock.calls[0][0]
    expect(prompt).toContain('Description: inverter generator')
  })

  it('omits the description line when absent', async () => {
    mockGenerate.mockResolvedValue({ object: rawSuggestion() })

    await suggestMaintenancePlan({
      input: { generatorModel: 'Honda EU2200i', locale: 'en' }
    })

    const prompt = mockGenerate.mock.calls[0][0]
    expect(prompt).not.toContain('Description:')
  })

  it('appends the Ukrainian locale block for locale "uk"', async () => {
    mockGenerate.mockResolvedValue({ object: rawSuggestion() })

    await suggestMaintenancePlan({
      input: { generatorModel: 'Honda EU2200i', locale: 'uk' }
    })

    const prompt = mockGenerate.mock.calls[0][0]
    expect(prompt).toContain('OUTPUT LANGUAGE: Ukrainian (uk)')
  })
})

describe('suggestMaintenancePlan handler — fallback on throw', () => {
  it('falls back to the generic plan when generate rejects', async () => {
    mockGenerate.mockRejectedValue(new Error('network down'))

    const result = await suggestMaintenancePlan({
      input: { generatorModel: 'Honda EU2200i', locale: 'en' }
    })

    expect(result.isGeneric).toBe(true)
    expect(result.tasks).toHaveLength(4)
    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('falls back to the generic plan when generate returns a malformed object', async () => {
    mockGenerate.mockResolvedValue({ object: { unexpected: true } })

    const result = await suggestMaintenancePlan({
      input: { generatorModel: 'Honda EU2200i', locale: 'en' }
    })

    expect(result.isGeneric).toBe(true)
    expect(result.tasks).toHaveLength(4)
    expect(consoleErrorSpy).toHaveBeenCalled()
  })
})

describe('suggestMaintenancePlan handler — valid AI output', () => {
  it('returns the AI plan, preserving isGeneric, sources and modelInfo', async () => {
    mockGenerate.mockResolvedValue({
      object: rawSuggestion({
        isGeneric: false,
        sources: ['https://honda.com'],
        modelInfo: 'Honda EU2200i manual'
      })
    })

    const result = await suggestMaintenancePlan({
      input: { generatorModel: 'Honda EU2200i', locale: 'en' }
    })

    expect(result.isGeneric).toBe(false)
    expect(result.sources).toEqual(['https://honda.com'])
    expect(result.modelInfo).toBe('Honda EU2200i manual')
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })
})

describe('suggestMaintenancePlan handler — repair + reparse seam', () => {
  it('repairs an AI task that the final schema would otherwise reject', async () => {
    // Valid against rawSuggestionSchema (nullable fields) but invalid against
    // maintenanceSuggestionSchema's superRefine: "hours" needs a non-null hours
    // interval. Without repairTasks running between the two parses, the final
    // parse throws — so this asserts the whole seam holds together.
    mockGenerate.mockResolvedValue({
      object: rawSuggestion({ tasks: [rawTask('hours', null, null)] })
    })

    const result = await suggestMaintenancePlan({
      input: { generatorModel: 'Honda EU2200i', locale: 'en' }
    })

    expect(result.tasks[0].triggerType).toBe('calendar')
    expect(result.tasks[0].triggerCalendarDays).toBe(90)
    expect(result.tasks[0].triggerHoursInterval).toBeNull()
  })
})
