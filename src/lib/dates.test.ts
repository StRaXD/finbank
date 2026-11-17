import { describe, expect, it } from 'vitest'
import {
  addMonths,
  currentMonth,
  isoDateOf,
  monthRange,
  parseIsoDate,
  selectableMonths,
  toIsoDate,
  toYearMonth,
  weekOf,
  yearMonthOf,
} from './dates'
import type { IsoDate, YearMonth } from './dates'

const iso = toIsoDate
const ym = toYearMonth

// getTimezoneOffset() on 2023-05-19 for each zone in the TZ matrix (see vitest.config.ts).
const EXPECTED_OFFSET: Record<string, number> = {
  UTC: 0,
  'America/Los_Angeles': 420,
  'Pacific/Kiritimati': -840,
  'America/Santiago': 240,
  'Asia/Kolkata': -330,
}

// FINBANK_TZ_MATRIX is set only by the tz:* vitest projects; the unit project uses the host zone.
const matrixTz: string | undefined = import.meta.env.FINBANK_TZ_MATRIX

describe('time-zone matrix', () => {
  it.skipIf(!matrixTz)('runs under the configured TZ', () => {
    expect(import.meta.env.TZ).toBe(matrixTz)
    expect(EXPECTED_OFFSET).toHaveProperty([matrixTz!])
    expect(parseIsoDate(iso('2023-05-19')).getTimezoneOffset()).toBe(EXPECTED_OFFSET[matrixTz!])
  })

  it('parses 2023-05-19 to 19 May in the local zone', () => {
    const d = parseIsoDate(iso('2023-05-19'))
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getDay()]).toEqual([2023, 4, 19, 5])
    expect(d.getHours()).toBe(0)
  })
})

describe('DST start that skips local midnight (America/Santiago, 2023-09-03)', () => {
  it.skipIf(matrixTz !== 'America/Santiago')('really skips local midnight in Santiago', () => {
    expect(parseIsoDate(iso('2023-09-03')).getHours()).toBe(1)
  })

  it('keeps the skipped-midnight day intact', () => {
    expect(toIsoDate('2023-09-03')).toBe('2023-09-03')
    expect(isoDateOf(parseIsoDate(iso('2023-09-03')))).toBe('2023-09-03')
  })

  it('builds the week that starts on the transition day', () => {
    expect(weekOf(iso('2023-09-05'))).toEqual([
      '2023-09-03',
      '2023-09-04',
      '2023-09-05',
      '2023-09-06',
      '2023-09-07',
      '2023-09-08',
      '2023-09-09',
    ])
    expect(weekOf(iso('2023-09-02'))[6]).toBe('2023-09-02')
  })

  it('spans the month containing the transition', () => {
    expect(monthRange(ym('2023-09'))).toEqual({ start: '2023-09-01', end: '2023-09-30' })
  })
})

describe('isoDateOf', () => {
  it('returns the local calendar day', () => {
    expect(isoDateOf(parseIsoDate(iso('2023-05-19')))).toBe('2023-05-19')
    expect(isoDateOf(parseIsoDate(iso('2024-02-29')))).toBe('2024-02-29')
  })

  it('ignores the time of day', () => {
    const late = parseIsoDate(iso('2023-05-19'))
    late.setHours(23, 59, 59, 999)
    expect(isoDateOf(late)).toBe('2023-05-19')
  })

  it('throws on an invalid Date', () => {
    const invalid = parseIsoDate(iso('2023-05-19'))
    invalid.setTime(NaN)
    expect(() => isoDateOf(invalid)).toThrow(RangeError)
  })
})

describe('toIsoDate', () => {
  it.each(['2023-05-19', '2024-02-29', '2023-12-31', '2023-01-01', '0099-03-01'])(
    'accepts %s',
    (s) => {
      expect(toIsoDate(s)).toBe(s)
    },
  )

  it.each([
    '2023-02-29',
    '2023-13-01',
    '2023-00-10',
    '2023-04-31',
    '2023-05-00',
    '2023-5-19',
    '2023-05-19T00:00:00Z',
    ' 2023-05-19',
    '0000-01-01',
    '',
    '19/05/2023',
  ])('throws on %j', (s) => {
    expect(() => toIsoDate(s)).toThrow(RangeError)
  })

  it('throws on non-strings', () => {
    expect(() => toIsoDate(20230519 as unknown as string)).toThrow(RangeError)
  })
})

describe('toYearMonth', () => {
  it.each(['2023-05', '2023-12', '2023-01'])('accepts %s', (s) => {
    expect(toYearMonth(s)).toBe(s)
  })

  it.each(['2023-13', '2023-00', '2023-5', '2023-05-01', '202305', '0000-01', ''])(
    'throws on %j',
    (s) => {
      expect(() => toYearMonth(s)).toThrow(RangeError)
    },
  )
})

describe('parseIsoDate', () => {
  it('keeps two-digit years literal', () => {
    expect(parseIsoDate(iso('0099-03-01')).getFullYear()).toBe(99)
  })

  it('throws on an unvalidated malformed string', () => {
    expect(() => parseIsoDate('2023-02-30' as IsoDate)).toThrow(RangeError)
  })
})

describe('yearMonthOf / currentMonth', () => {
  it('returns the containing month', () => {
    expect(yearMonthOf(iso('2023-05-19'))).toBe('2023-05')
    expect(currentMonth(iso('2023-05-19'))).toBe('2023-05')
    expect(currentMonth(iso('2024-01-01'))).toBe('2024-01')
  })
})

describe('monthRange', () => {
  it.each([
    ['2023-05', '2023-05-01', '2023-05-31'],
    ['2023-04', '2023-04-01', '2023-04-30'],
    ['2023-02', '2023-02-01', '2023-02-28'],
    ['2024-02', '2024-02-01', '2024-02-29'],
    ['2023-12', '2023-12-01', '2023-12-31'],
  ])('%s spans %s to %s', (m, start, end) => {
    expect(monthRange(ym(m))).toEqual({ start, end })
  })
})

describe('weekOf', () => {
  it('returns Sunday to Saturday around a Friday', () => {
    expect(weekOf(iso('2023-05-19'))).toEqual([
      '2023-05-14',
      '2023-05-15',
      '2023-05-16',
      '2023-05-17',
      '2023-05-18',
      '2023-05-19',
      '2023-05-20',
    ])
  })

  it('starts on the given day when it is a Sunday', () => {
    expect(weekOf(iso('2023-05-14'))[0]).toBe('2023-05-14')
  })

  it('ends on the given day when it is a Saturday', () => {
    expect(weekOf(iso('2023-05-20'))[6]).toBe('2023-05-20')
  })

  it('crosses month and year boundaries', () => {
    expect(weekOf(iso('2023-01-01'))).toEqual([
      '2023-01-01',
      '2023-01-02',
      '2023-01-03',
      '2023-01-04',
      '2023-01-05',
      '2023-01-06',
      '2023-01-07',
    ])
    expect(weekOf(iso('2022-12-31'))[0]).toBe('2022-12-25')
    expect(weekOf(iso('2023-03-01'))[0]).toBe('2023-02-26')
  })

  it('is unaffected by DST transitions', () => {
    // US DST starts 2023-03-12 and ends 2023-11-05 (both Sundays).
    expect(weekOf(iso('2023-03-15'))).toEqual([
      '2023-03-12',
      '2023-03-13',
      '2023-03-14',
      '2023-03-15',
      '2023-03-16',
      '2023-03-17',
      '2023-03-18',
    ])
    expect(weekOf(iso('2023-11-07'))[0]).toBe('2023-11-05')
  })
})

describe('addMonths', () => {
  it.each([
    ['2023-05', 0, '2023-05'],
    ['2023-05', 1, '2023-06'],
    ['2023-05', -1, '2023-04'],
    ['2023-12', 1, '2024-01'],
    ['2023-01', -1, '2022-12'],
    ['2023-05', -11, '2022-06'],
    ['2023-05', 24, '2025-05'],
  ])('%s + %i is %s', (m, n, expected) => {
    expect(addMonths(ym(m), n)).toBe(expected)
  })

  it('throws on a non-integer count', () => {
    expect(() => addMonths(ym('2023-05'), 1.5)).toThrow(TypeError)
  })

  it('throws on a malformed month', () => {
    expect(() => addMonths('2023-13' as YearMonth, 1)).toThrow(RangeError)
  })
})

describe('selectableMonths', () => {
  it('returns the 12 months ending with today, newest first', () => {
    expect(selectableMonths(iso('2023-05-19'))).toEqual([
      '2023-05',
      '2023-04',
      '2023-03',
      '2023-02',
      '2023-01',
      '2022-12',
      '2022-11',
      '2022-10',
      '2022-09',
      '2022-08',
      '2022-07',
      '2022-06',
    ])
  })

  it('includes the current month on its first and last day', () => {
    expect(selectableMonths(iso('2023-05-01'))[0]).toBe('2023-05')
    expect(selectableMonths(iso('2023-05-31'))[0]).toBe('2023-05')
    expect(selectableMonths(iso('2023-05-31'))[11]).toBe('2022-06')
  })
})
