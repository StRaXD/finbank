import { describe, expect, it } from 'vitest'
import { toIsoDate, toYearMonth } from './dates'
import type { IsoDate, YearMonth } from './dates'
import {
  formatCompact,
  formatDate,
  formatMoney,
  formatPercent,
  formatRange,
  maskAccountNumber,
} from './format'
import type { CompactMode, DateMode, MaskMode, MoneyMode } from './format'

describe('FR-34 format table', () => {
  it.each([
    [formatMoney(24039900, 'whole'), '$240,399'],
    [formatMoney(2505600, 'exact'), '$25,056.00'],
    [formatCompact(1250000, 'gauge'), '12K'],
    [formatCompact(200000, 'axis'), '$2k'],
    [formatPercent(8), '08%'],
    [formatDate(toIsoDate('2023-05-17'), 'row'), '17 May 2023'],
    [formatDate(toIsoDate('2023-05-15'), 'badge'), 'May 15'],
    [formatDate(toIsoDate('2023-05-19'), 'header'), 'May 19, 2023'],
    [formatDate(toIsoDate('2023-05-01'), 'axisDay'), 'May 01'],
    [formatDate(toIsoDate('2023-05-14'), 'weekday'), '14 Sun'],
    [formatDate(toIsoDate('2023-01-10'), 'month'), 'Jan'],
    [formatRange(toYearMonth('2023-05')), '01 May ~ 31 May'],
  ])('%s', (actual, expected) => {
    expect(actual).toBe(expected)
  })
})

describe('formatMoney', () => {
  it.each([
    [0, 'whole', '$0'],
    [0, 'exact', '$0.00'],
    [1, 'exact', '$0.01'],
    [15000, 'whole', '$150'],
    [16000, 'exact', '$160.00'],
    [2500000, 'whole', '$25,000'],
    [99999, 'exact', '$999.99'],
    [100000000, 'whole', '$1,000,000'],
    [123456789, 'exact', '$1,234,567.89'],
    // half-up rounding boundaries
    [149, 'whole', '$1'],
    [150, 'whole', '$2'],
    [99949, 'whole', '$999'],
    [99950, 'whole', '$1,000'],
    [49, 'whole', '$0'],
    // negatives
    [-2505600, 'exact', '-$25,056.00'],
    [-24039900, 'whole', '-$240,399'],
    [-150, 'whole', '-$2'],
    [-149, 'whole', '-$1'],
    [-1, 'exact', '-$0.01'],
    [-49, 'whole', '$0'],
    // ungrouped: whole dollars without separators (Saving Summary ticks)
    [500000, 'ungrouped', '$5000'],
    [0, 'ungrouped', '$0'],
    [123456789, 'ungrouped', '$1234568'],
    [-150, 'ungrouped', '-$2'],
  ] as const)('%i %s → %s', (cents, mode, expected) => {
    expect(formatMoney(cents, mode)).toBe(expected)
  })

  it.each([1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 2])('throws on %s', (cents) => {
    expect(() => formatMoney(cents, 'exact')).toThrow(TypeError)
  })

  it('throws on an unknown mode', () => {
    expect(() => formatMoney(100, 'round' as MoneyMode)).toThrow(RangeError)
  })
})

describe('formatCompact', () => {
  it.each([
    [0, 'gauge', '0'],
    [0, 'axis', '$0'],
    [15000, 'gauge', '150'],
    [15099, 'axis', '$150'],
    [99999, 'gauge', '999'],
    [100000, 'gauge', '1K'],
    [100000, 'axis', '$1k'],
    [1250000, 'axis', '$12.5k'],
    [1250000, 'gauge', '12K'],
    [125000, 'axis', '$1.2k'],
    [250000, 'axis', '$2.5k'],
    [200000, 'axis', '$2k'],
    [25000000, 'axis', '$250k'],
    [1299999, 'axis', '$12.9k'],
    [1205000, 'axis', '$12k'],
    [250000000, 'axis', '$2.5m'],
    [250000000, 'gauge', '2M'],
    [-250000, 'axis', '-$2.5k'],
    [1299999, 'gauge', '12K'],
    [99999999, 'gauge', '999K'],
    [100000000, 'gauge', '1M'],
    [100000000, 'axis', '$1m'],
    [159999999, 'gauge', '1M'],
    [2500000000, 'axis', '$25m'],
    [-1250000, 'gauge', '-12K'],
    [-200000, 'axis', '-$2k'],
    [-50, 'axis', '$0'],
  ] as const)('%i %s → %s', (cents, mode, expected) => {
    expect(formatCompact(cents, mode)).toBe(expected)
  })

  it('throws on non-integer cents', () => {
    expect(() => formatCompact(0.1, 'gauge')).toThrow(TypeError)
  })

  it('throws on an unknown mode', () => {
    expect(() => formatCompact(100, 'chart' as CompactMode)).toThrow(RangeError)
  })
})

describe('formatPercent', () => {
  it.each([
    [0, '00%'],
    [8, '08%'],
    [-8, '08%'],
    [12, '12%'],
    [-45, '45%'],
    [100, '100%'],
  ])('%i → %s', (pct, expected) => {
    expect(formatPercent(pct)).toBe(expected)
  })

  it.each([8.5, NaN, Infinity, '8'])('throws on %s', (pct) => {
    expect(() => formatPercent(pct as number)).toThrow(TypeError)
  })
})

describe('formatDate', () => {
  it.each([
    ['2023-05-05', 'row', '5 May 2023'],
    ['2023-12-31', 'row', '31 Dec 2023'],
    ['2023-06-05', 'badge', 'Jun 5'],
    ['2023-06-05', 'header', 'June 5, 2023'],
    ['2023-12-09', 'axisDay', 'Dec 09'],
    ['2023-05-20', 'weekday', '20 Sat'],
    ['2023-05-01', 'weekday', '01 Mon'],
    ['2023-12-31', 'month', 'Dec'],
    ['2023-05-01', 'monthYear', 'May 2023'],
    ['2022-03-31', 'monthYear', 'Mar 2022'],
    ['2023-05-25', 'day', '25'],
    ['2023-06-05', 'day', '5'],
  ] as const)('%s %s → %s', (date, mode, expected) => {
    expect(formatDate(toIsoDate(date), mode)).toBe(expected)
  })

  it('formats 2023-05-19 as 19 May in every time zone', () => {
    expect(formatDate(toIsoDate('2023-05-19'), 'row')).toBe('19 May 2023')
    expect(formatDate(toIsoDate('2023-05-19'), 'weekday')).toBe('19 Fri')
  })

  it.each(['2023-02-30', '2023-05-19T00:00:00Z', '', 'May 19'])('throws on %j', (date) => {
    expect(() => formatDate(date as IsoDate, 'row')).toThrow(RangeError)
  })

  it.each(['long', 'toString', '__proto__'])('throws on unknown mode %j', (mode) => {
    expect(() => formatDate(toIsoDate('2023-05-19'), mode as DateMode)).toThrow(RangeError)
  })
})

describe('formatRange', () => {
  it.each([
    ['2023-04', '01 Apr ~ 30 Apr'],
    ['2023-02', '01 Feb ~ 28 Feb'],
    ['2024-02', '01 Feb ~ 29 Feb'],
    ['2023-12', '01 Dec ~ 31 Dec'],
  ])('%s → %s', (m, expected) => {
    expect(formatRange(toYearMonth(m))).toBe(expected)
  })

  it.each(['2023-13', '2023-5', ''])('throws on %j', (m) => {
    expect(() => formatRange(m as YearMonth)).toThrow(RangeError)
  })
})

describe('maskAccountNumber', () => {
  it.each([
    ['13345688681234', 'groups', '133 456 886 8****'],
    ['1234567890', 'groups', '123 456****'],
    ['12345678', 'groups', '123 4****'],
    ['1234', 'groups', '****'],
    ['3388 4556 8860 2598', 'tail4', '**** **** **** 2598'],
    ['4562112245952598', 'tail4', '**** **** **** 2598'],
    ['2598', 'tail4', '**** **** **** 2598'],
  ] as const)('%s %s → %s', (num, mode, expected) => {
    expect(maskAccountNumber(num, mode)).toBe(expected)
  })

  it.each(['', '123', '12a45678', '1234-5678'])('throws on %j', (num) => {
    expect(() => maskAccountNumber(num, 'tail4')).toThrow(RangeError)
  })

  it('does not echo the rejected account number in the error', () => {
    const num = '1234-5678-9012'
    expect(() => maskAccountNumber(num, 'groups')).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('5678') }),
    )
  })

  it('throws on an unknown mode', () => {
    expect(() => maskAccountNumber('12345678', 'full' as MaskMode)).toThrow(RangeError)
  })
})
