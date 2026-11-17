import { describe, expect, it } from 'vitest'
import { assertCents, centsToDollars, dollarsToCents } from './money'

describe('assertCents', () => {
  it.each([0, 1, -1, 2505600, Number.MAX_SAFE_INTEGER])('accepts %s', (v) => {
    expect(() => assertCents(v)).not.toThrow()
  })

  it.each([0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, '100', null, undefined])(
    'rejects %s',
    (v) => {
      expect(() => assertCents(v)).toThrow(TypeError)
    },
  )
})

describe('dollarsToCents', () => {
  it.each([
    ['25,056.00', 2505600],
    ['25056', 2505600],
    ['25056.5', 2505650],
    ['1,234,567.89', 123456789],
    ['$160.00', 16000],
    ['  42 ', 4200],
    ['0', 0],
    ['0.01', 1],
    ['.5', 50],
    ['7.', 700],
    ['-3', -300],
    ['-$1.25', -125],
    ['-0', 0],
  ])('parses %j as %i', (input, cents) => {
    expect(dollarsToCents(input)).toBe(cents)
  })

  it.each([
    '',
    ' ',
    '.',
    '$',
    '-',
    'abc',
    '1.234',
    '12,34',
    '1,2345',
    ',123',
    '1..2',
    '1e3',
    '1 000',
    '--1',
    '99999999999999999',
  ])('returns null for %j', (input) => {
    expect(dollarsToCents(input)).toBeNull()
  })
})

describe('dollarsToCents with non-string input', () => {
  it.each([undefined, null, 42])('returns null for %s', (input) => {
    expect(dollarsToCents(input as unknown as string)).toBeNull()
  })
})

describe('centsToDollars', () => {
  it('converts integer cents to dollars', () => {
    expect(centsToDollars(2505600)).toBe(25056)
    expect(centsToDollars(150)).toBe(1.5)
    expect(centsToDollars(-1)).toBe(-0.01)
  })

  it('throws on non-integer cents', () => {
    expect(() => centsToDollars(1.5)).toThrow(TypeError)
  })
})
