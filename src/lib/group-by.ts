/**
 * Group an array of items into a Map keyed by a string extracted from each item.
 */
export function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string
): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = keyFn(item)
    const existing = map.get(key)
    if (existing) existing.push(item)
    else map.set(key, [item])
  }
  return map
}
