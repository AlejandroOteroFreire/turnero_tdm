import { startOfWeek, addDays, format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import type { SlotDay } from '@/types'

export const TZ = 'America/Argentina/Buenos_Aires'

export function nowInBA(): Date {
  return toZonedTime(new Date(), TZ)
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 6 }, (_, i) => addDays(weekStart, i))
}

export function currentWeekStart(): Date {
  return startOfWeek(nowInBA(), { weekStartsOn: 1 })
}

export function formatDateES(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, "d 'de' MMMM 'de' yyyy")
}

export function formatTimeRange(start: string, end: string): string {
  return `${start.slice(0, 5)} – ${end.slice(0, 5)}`
}

export const DAY_OFFSETS: Record<SlotDay, number> = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5,
}
