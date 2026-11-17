// The only module that parses dates or does date arithmetic (AD-9).
//
// Time-zone safety: calendar dates are kept as `YYYY-MM-DD` strings. When date-fns needs a
// `Date`, one is built from validated parts at local midnight (`new Date(y, m - 1, d)`) and
// read back with local getters, so the calendar day never depends on the runtime's offset.
// Never `Date.parse` or `new Date('2023-05-19')`, which is UTC midnight and shifts the day.
import {
  addDays as addDaysToDate,
  addMonths as addMonthsToDate,
  format,
  lastDayOfMonth,
  startOfWeek,
} from 'date-fns'

declare const isoDateBrand: unique symbol
declare const yearMonthBrand: unique symbol

/** A calendar date, `YYYY-MM-DD`. Build one with `toIsoDate`. */
export type IsoDate = string & { readonly [isoDateBrand]: true }
/** A calendar month, `YYYY-MM`. Build one with `toYearMonth`. */
export type YearMonth = string & { readonly [yearMonthBrand]: true }

/** Seven consecutive dates, Sunday first. */
export type Week = readonly [IsoDate, IsoDate, IsoDate, IsoDate, IsoDate, IsoDate, IsoDate]

const WEEK_STARTS_ON = 0
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const YEAR_MONTH = /^(\d{4})-(\d{2})$/

function localDate(year: number, month: number, day: number): Date {
  const date = new Date(year, month - 1, day)
  // `new Date(y, …)` maps years 0–99 to 1900–1999; pin the real year.
  date.setFullYear(year, month - 1, day)
  return date
}

/** The local calendar day of `date` (e.g. a real-clock "now" from an adapter). */
export function isoDateOf(date: Date): IsoDate {
  return format(date, 'yyyy-MM-dd') as IsoDate
}

/** Validates `YYYY-MM-DD` (including the day existing in that month). Throws otherwise. */
export function toIsoDate(value: string): IsoDate {
  const match = typeof value === 'string' ? ISO_DATE.exec(value) : null
  if (match) {
    const [year, month, day] = match.slice(1).map(Number) as [number, number, number]
    const date = localDate(year, month, day)
    if (
      year >= 1 &&
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return value as IsoDate
    }
  }
  throw new RangeError(`Invalid IsoDate (expected YYYY-MM-DD): ${String(value)}`)
}

/** Validates `YYYY-MM` (month 01–12). Throws otherwise. */
export function toYearMonth(value: string): YearMonth {
  const match = typeof value === 'string' ? YEAR_MONTH.exec(value) : null
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    if (year >= 1 && month >= 1 && month <= 12) return value as YearMonth
  }
  throw new RangeError(`Invalid YearMonth (expected YYYY-MM): ${String(value)}`)
}

/** The `Date` at local midnight of `iso`. Read it only with local getters or date-fns. */
export function parseIsoDate(iso: IsoDate): Date {
  const [year, month, day] = toIsoDate(iso).split('-').map(Number) as [number, number, number]
  return localDate(year, month, day)
}

function firstOfMonth(ym: YearMonth): Date {
  const [year, month] = toYearMonth(ym).split('-').map(Number) as [number, number]
  return localDate(year, month, 1)
}

/** The month that contains `iso`. */
export function yearMonthOf(iso: IsoDate): YearMonth {
  return toIsoDate(iso).slice(0, 7) as YearMonth
}

/** The month that contains `today`. */
export function currentMonth(today: IsoDate): YearMonth {
  return yearMonthOf(today)
}

/** The first and last calendar day of `ym`. */
export function monthRange(ym: YearMonth): { start: IsoDate; end: IsoDate } {
  const first = firstOfMonth(ym)
  return { start: isoDateOf(first), end: isoDateOf(lastDayOfMonth(first)) }
}

/** The Sunday–Saturday week that contains `today`. */
export function weekOf(today: IsoDate): Week {
  const sunday = startOfWeek(parseIsoDate(today), { weekStartsOn: WEEK_STARTS_ON })
  return Array.from({ length: 7 }, (_, i) => isoDateOf(addDaysToDate(sunday, i))) as unknown as Week
}

/** `iso` shifted by `n` calendar days (negative goes back). */
export function addDays(iso: IsoDate, n: number): IsoDate {
  if (!Number.isSafeInteger(n)) throw new TypeError(`Expected an integer day count, got ${n}`)
  return isoDateOf(addDaysToDate(parseIsoDate(iso), n))
}

/** `ym` shifted by `n` whole months (negative goes back). */
export function addMonths(ym: YearMonth, n: number): YearMonth {
  if (!Number.isSafeInteger(n)) throw new TypeError(`Expected an integer month count, got ${n}`)
  return format(addMonthsToDate(firstOfMonth(ym), n), 'yyyy-MM') as YearMonth
}

/** The 12 months ending with the month that contains `today`, newest first. */
export function selectableMonths(today: IsoDate): YearMonth[] {
  const latest = currentMonth(today)
  return Array.from({ length: 12 }, (_, i) => addMonths(latest, -i))
}
