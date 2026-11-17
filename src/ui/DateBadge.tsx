import type { IsoDate } from '../lib/dates.ts'
import { formatDate } from '../lib/format.ts'

export type DateBadgeSize = 'md' | 'sm'

export type DateBadgeProps = {
  date: IsoDate
  /** `md` (default) is the 72×82 Bills table badge (108); `sm` the narrower Overview widget badge (104). */
  size?: DateBadgeSize
}

const boxClass: Record<DateBadgeSize, string> = {
  md: 'h-20.5 w-18 gap-1',
  sm: 'h-16 w-11 gap-0.5',
}

const dayClass: Record<DateBadgeSize, string> = {
  md: 'text-24',
  sm: 'text-22',
}

/**
 * A due date as a light-grey box with the month above the day number (measured from 108. Bills.png:
 * a muted month and a large bold day). Assistive tech reads it as "Due May 25".
 */
export function DateBadge({ date, size = 'md' }: DateBadgeProps) {
  const month = formatDate(date, 'month')
  const day = formatDate(date, 'day')
  return (
    <span
      role="img"
      aria-label={`Due ${month} ${day}`}
      className={`inline-flex shrink-0 flex-col items-center justify-center rounded-card bg-surface ${boxClass[size]}`}
    >
      <span aria-hidden="true" className={`font-medium text-subtle ${size === 'md' ? 'text-16' : 'text-14'}`}>
        {month}
      </span>
      <span aria-hidden="true" className={`font-bold text-ink-2 ${dayClass[size]}`}>
        {day}
      </span>
    </span>
  )
}
