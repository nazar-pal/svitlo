import { circularDistance } from '../circular-distance'

describe('circularDistance', () => {
  const PAGE = 100
  const COUNT = 5
  // period = 500

  it('returns 0 when scrollX is at the center of the target page', () => {
    expect(circularDistance(200, 2, COUNT, PAGE)).toBe(0)
  })

  it('returns positive distance when scrolled past center', () => {
    expect(circularDistance(230, 2, COUNT, PAGE)).toBe(30)
  })

  it('returns negative distance when scrolled before center', () => {
    expect(circularDistance(170, 2, COUNT, PAGE)).toBe(-30)
  })

  it('wraps forward when distance exceeds half the period', () => {
    // index=0, center=0, scrollX=400 → raw dist=400 > 250 → 400-500 = -100
    expect(circularDistance(400, 0, COUNT, PAGE)).toBe(-100)
  })

  it('wraps backward when distance is below negative half the period', () => {
    // index=4, center=400, scrollX=50 → raw dist=-350 < -250 → -350+500 = 150
    expect(circularDistance(50, 4, COUNT, PAGE)).toBe(150)
  })

  it('does not wrap at exactly half the period (> not >=)', () => {
    // index=0, center=0, scrollX=250 → raw dist=250, not > 250 → stays 250
    expect(circularDistance(250, 0, COUNT, PAGE)).toBe(250)
  })

  it('does not wrap at exactly negative half the period (< not <=)', () => {
    // index=0, center=0, scrollX=-250 → raw dist=-250, not < -250 → stays -250
    expect(circularDistance(-250, 0, COUNT, PAGE)).toBe(-250)
  })

  it('wraps just past the positive boundary', () => {
    // raw dist=251 > 250 → 251-500 = -249
    expect(circularDistance(251, 0, COUNT, PAGE)).toBe(-249)
  })

  it('handles count=1 (period equals pageWidth)', () => {
    // period=100, center=0, scrollX=60 → raw=60 > 50 → 60-100 = -40
    expect(circularDistance(60, 0, 1, PAGE)).toBe(-40)
  })

  it('handles count=2', () => {
    // period=200, center=100, scrollX=10 → raw=-90, not < -100 → stays -90
    expect(circularDistance(10, 1, 2, PAGE)).toBe(-90)
  })
})
