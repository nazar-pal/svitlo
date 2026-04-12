import { insertGeneratorSchema, updateGeneratorSchema } from '../generators'

function validGeneratorInput() {
  return {
    organizationId: 'org-1',
    title: 'Honda EU2200i',
    model: 'EU2200i',
    maxConsecutiveRunHours: 8,
    requiredRestHours: 4
  }
}

describe('insertGeneratorSchema', () => {
  it('accepts valid complete input', () => {
    const result = insertGeneratorSchema.safeParse(validGeneratorInput())
    expect(result.success).toBe(true)
  })

  it('defaults runWarningThresholdPct to 80', () => {
    const result = insertGeneratorSchema.safeParse(validGeneratorInput())
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.runWarningThresholdPct).toBe(80)
  })

  it('accepts custom runWarningThresholdPct', () => {
    const result = insertGeneratorSchema.safeParse({
      ...validGeneratorInput(),
      runWarningThresholdPct: 50
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.runWarningThresholdPct).toBe(50)
  })

  it('rejects empty title', () => {
    const result = insertGeneratorSchema.safeParse({
      ...validGeneratorInput(),
      title: ''
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty model', () => {
    const result = insertGeneratorSchema.safeParse({
      ...validGeneratorInput(),
      model: ''
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero maxConsecutiveRunHours', () => {
    const result = insertGeneratorSchema.safeParse({
      ...validGeneratorInput(),
      maxConsecutiveRunHours: 0
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative requiredRestHours', () => {
    const result = insertGeneratorSchema.safeParse({
      ...validGeneratorInput(),
      requiredRestHours: -1
    })
    expect(result.success).toBe(false)
  })

  it('rejects runWarningThresholdPct below 1', () => {
    const result = insertGeneratorSchema.safeParse({
      ...validGeneratorInput(),
      runWarningThresholdPct: 0
    })
    expect(result.success).toBe(false)
  })

  it('rejects runWarningThresholdPct above 100', () => {
    const result = insertGeneratorSchema.safeParse({
      ...validGeneratorInput(),
      runWarningThresholdPct: 101
    })
    expect(result.success).toBe(false)
  })
})

describe('updateGeneratorSchema', () => {
  it('accepts partial update with single field', () => {
    const result = updateGeneratorSchema.safeParse({ title: 'New Title' })
    expect(result.success).toBe(true)
  })

  it('rejects empty object (at least one field required)', () => {
    const result = updateGeneratorSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('validates field constraints on provided fields', () => {
    const result = updateGeneratorSchema.safeParse({
      maxConsecutiveRunHours: -5
    })
    expect(result.success).toBe(false)
  })
})
