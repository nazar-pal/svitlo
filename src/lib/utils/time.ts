import {
  differenceInMilliseconds,
  differenceInMinutes,
  intervalToDuration,
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

export function formatDuration(ms: number): string {
  const {
    hours = 0,
    minutes = 0,
    seconds = 0
  } = intervalToDuration({
    start: 0,
    end: ms
  })
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 10) return `${hours.toFixed(1)}h`
  return `${Math.round(hours)}h`
}
