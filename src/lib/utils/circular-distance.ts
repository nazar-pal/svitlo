export function circularDistance(
  scrollX: number,
  index: number,
  count: number,
  pageWidth: number
): number {
  'worklet'
  const period = count * pageWidth
  const center = index * pageWidth
  let dist = scrollX - center
  if (dist > period / 2) dist -= period
  if (dist < -period / 2) dist += period
  return dist
}
