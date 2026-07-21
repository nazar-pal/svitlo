import { usesCalendar, usesHours } from '../trigger-type'

// Canonical trigger-fields truth table. All layers (Zod validation, AI
// suggestion refine, update-template policy, due computation, and the
// template-form UI) branch through these two predicates, so this is the one
// place the hours/calendar mapping is pinned.

describe('usesHours', () => {
  it('is true for hours', () => expect(usesHours('hours')).toBe(true))
  it('is true for whichever_first', () =>
    expect(usesHours('whichever_first')).toBe(true))
  it('is false for calendar', () => expect(usesHours('calendar')).toBe(false))
})

describe('usesCalendar', () => {
  it('is true for calendar', () => expect(usesCalendar('calendar')).toBe(true))
  it('is true for whichever_first', () =>
    expect(usesCalendar('whichever_first')).toBe(true))
  it('is false for hours', () => expect(usesCalendar('hours')).toBe(false))
})
