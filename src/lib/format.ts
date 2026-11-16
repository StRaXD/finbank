// All display formatting (AD-10, FR-34). English / en-US only.
//
// Which money mode to use (FR-34):
// - 'whole' (no decimals): Total Balance, account card totals (carousel and Balances),
//   bill amounts, Savings Goal amounts.
// - 'exact' (two decimals): everything else: transactions, expense items, category totals and
//   limits, Account Details balance.
//
// Amounts are formatted with integer arithmetic only; `Intl` is used just for digit grouping.
import { format } from 'date-fns'
import { parseIsoDate, toIsoDate, toYearMonth, monthRange } from './dates'
import type { IsoDate, YearMonth } from './dates'
import { assertCents } from './money'

export type MoneyMode = 'whole' | 'exact'
export type CompactMode = 'gauge' | 'axis'
export type DateMode = 'row' | 'badge' | 'header' | 'axisDay' | 'weekday' | 'month'
export type MaskMode = 'groups' | 'tail4'

const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, useGrouping: true })

function signOf(cents: number, magnitude: number): string {
  return cents < 0 && magnitude > 0 ? '-' : ''
}

/**
 * USD with thousands separators. 'whole' rounds half-up (away from zero) to dollars:
 * 24039900 → "$240,399". 'exact' keeps cents: 2505600 → "$25,056.00". Negatives are "-$…".
 */
export function formatMoney(cents: number, mode: MoneyMode): string {
  assertCents(cents)
  const abs = Math.abs(cents)
  if (mode === 'whole') {
    const dollars = Math.floor((abs + 50) / 100)
    return `${signOf(cents, dollars)}$${grouped.format(dollars)}`
  }
  if (mode === 'exact') {
    const dollars = Math.floor(abs / 100)
    const rest = String(abs % 100).padStart(2, '0')
    return `${signOf(cents, abs)}$${grouped.format(dollars)}.${rest}`
  }
  throw new RangeError(`Unknown money mode: ${String(mode)}`)
}

const COMPACT_STEPS = [
  { size: 1_000_000, gauge: 'M', axis: 'm' },
  { size: 1_000, gauge: 'K', axis: 'k' },
] as const

/**
 * Abbreviated whole dollars, truncated (never rounded up): $12,500 → "12K" (gauge) or "$12k"
 * (axis). Values under $1,000 print whole dollars: "150" / "$150".
 */
export function formatCompact(cents: number, mode: CompactMode): string {
  assertCents(cents)
  if (mode !== 'gauge' && mode !== 'axis') {
    throw new RangeError(`Unknown compact mode: ${String(mode)}`)
  }
  const dollars = Math.floor(Math.abs(cents) / 100)
  const step = COMPACT_STEPS.find((s) => dollars >= s.size)
  const value = step ? Math.floor(dollars / step.size) : dollars
  const suffix = step ? step[mode] : ''
  const currency = mode === 'axis' ? '$' : ''
  return `${signOf(cents, value)}${currency}${value}${suffix}`
}

/**
 * The magnitude of a signed integer percentage, zero-padded to two digits: 8 → "08%",
 * -12 → "12%". Direction is shown by the trend arrow, not a sign.
 */
export function formatPercent(changePct: number): string {
  if (typeof changePct !== 'number' || !Number.isSafeInteger(changePct)) {
    throw new TypeError(`Expected an integer percentage, got ${String(changePct)}`)
  }
  return `${String(Math.abs(changePct)).padStart(2, '0')}%`
}

const DATE_PATTERNS: Record<DateMode, string> = {
  row: 'd MMM yyyy', // 17 May 2023
  badge: 'MMM d', // May 15
  header: 'MMMM d, yyyy', // May 19, 2023
  axisDay: 'MMM dd', // May 01
  weekday: 'dd EEE', // 14 Sun
  month: 'MMM', // Jan
}

/** Formats a calendar date for display. Throws on a malformed date or unknown mode. */
export function formatDate(iso: IsoDate, mode: DateMode): string {
  const pattern = Object.hasOwn(DATE_PATTERNS, mode) ? DATE_PATTERNS[mode] : undefined
  if (!pattern) throw new RangeError(`Unknown date mode: ${String(mode)}`)
  return format(parseIsoDate(toIsoDate(iso)), pattern)
}

/** The first and last day of a month: "2023-05" → "01 May ~ 31 May". */
export function formatRange(ym: YearMonth): string {
  const { start, end } = monthRange(toYearMonth(ym))
  return `${format(parseIsoDate(start), 'dd MMM')} ~ ${format(parseIsoDate(end), 'dd MMM')}`
}

/**
 * Masks an account number (digits only; spaces are ignored).
 * - 'groups': the visible digits grouped in 3s from the left, then the last 4 as "****":
 *   "13345688681234" → "133 456 886 8****".
 * - 'tail4': "**** **** **** " plus the last 4 digits: "**** **** **** 2598".
 */
export function maskAccountNumber(num: string, mode: MaskMode): string {
  const digits = typeof num === 'string' ? num.replace(/\s+/g, '') : ''
  if (!/^\d{4,}$/.test(digits)) {
    throw new RangeError(`Expected an account number of at least 4 digits, got ${String(num)}`)
  }
  if (mode === 'tail4') return `**** **** **** ${digits.slice(-4)}`
  if (mode === 'groups') {
    const visible = digits.slice(0, -4).match(/\d{1,3}/g) ?? []
    return `${visible.join(' ')}****`
  }
  throw new RangeError(`Unknown mask mode: ${String(mode)}`)
}
