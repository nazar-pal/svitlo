import {
  differenceInMilliseconds,
  differenceInMinutes,
  parseISO
} from 'date-fns'

export function hoursBetween(start: string, end: string): number {
  return differenceInMilliseconds(parseISO(end), parseISO(start)) / 3_600_000
}

export function formatRestRemaining(restEndsAt: Date): string {
  const totalMinutes = Math.max(0, differenceInMinutes(restEndsAt, new Date()))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}
