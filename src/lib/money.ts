// Integer-cents helpers (AD-9). Every amount in the app is an integer number of cents.

/** Throws unless `value` is a safe integer number of cents. */
export function assertCents(value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new TypeError(`Expected an integer number of cents, got ${String(value)}`)
  }
}

// Optional sign, optional `$`, whole dollars either plain ("25056") or grouped by thousands
// ("25,056"), then an optional fraction of at most two digits. A bare ".5" is also accepted.
const DOLLARS = /^(-)?\$?(\d+|\d{1,3}(?:,\d{3})+)?(?:\.(\d{0,2}))?$/

/**
 * Parses a user-typed dollar amount into integer cents, without floating-point arithmetic.
 * "25,056.00" → 2505600, "$1.5" → 150, "-3" → -300. Returns `null` for anything else
 * (empty input, bad grouping, more than two decimals, letters, out-of-range values).
 */
export function dollarsToCents(input: string | null | undefined): number | null {
  if (typeof input !== 'string') return null
  const match = DOLLARS.exec(input.trim())
  if (!match) return null
  const [, sign, whole = '', fraction] = match
  if (whole === '' && !fraction) return null
  const dollars = whole.replaceAll(',', '') || '0'
  const cents = Number(dollars) * 100 + Number((fraction ?? '').padEnd(2, '0'))
  if (!Number.isSafeInteger(cents)) return null
  return sign && cents !== 0 ? -cents : cents
}

/** Converts integer cents to a dollar number (e.g. for a form default). */
export function centsToDollars(cents: number): number {
  assertCents(cents)
  return cents / 100
}
