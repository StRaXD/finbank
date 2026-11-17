// The chart value scale (AD-16): evenly spaced ticks with linear interpolation between neighbours.
// Charts plot `toPlot(cents)` on a 0…n−1 axis and label the axis from `ticks`. Not a log scale.

/** One axis tick: its plot position (0…n−1) and the money value it stands for. */
export type Tick = { plot: number; cents: number }

export type TickScale = {
  /** The plot position of `cents`: linear between adjacent ticks, clamped to [0, n−1]. */
  toPlot(cents: number): number
  /** The ticks at plot positions 0…n−1, in ascending order. */
  ticks: readonly Tick[]
}

/** The comparison bar chart ticks: $0, $2k, $10k, $50k, $250k. */
export const BAR_TICKS: readonly number[] = Object.freeze([0, 2_000_00, 10_000_00, 50_000_00, 250_000_00])
/** The comparison ladder at k = 0, in cents: $0, $2, $10, $50, $250. Ladder k is this × 10^k. */
const LADDER_BASE: readonly number[] = Object.freeze([0, 2_00, 10_00, 50_00, 250_00])

/**
 * The comparison chart ticks fitted to the data: ladder k is {0, 2, 10, 50, 250} × 10^k dollars
 * (k = 3 is `BAR_TICKS`), for the smallest k ≥ 0 whose top tick is at least `maxCents`. A max of
 * 0 or less gives k = 0. Presentation only: the caller passes the largest value it shows.
 */
export function fitLadderTicks(maxCents: number): readonly number[] {
  if (!Number.isFinite(maxCents)) throw new TypeError(`Expected a finite amount, got ${maxCents}`)
  let factor = 1
  const top = LADDER_BASE[LADDER_BASE.length - 1]!
  // Integer arithmetic only: compare against the exact top tick, never a logarithm.
  while (top * factor < maxCents && Number.isSafeInteger(top * factor * 10)) factor *= 10
  return Object.freeze(LADDER_BASE.map((cents) => cents * factor))
}

/** The saving chart ticks (Epic 4): $0, $500, $2k, $5k. */
export const SAVING_TICKS: readonly number[] = Object.freeze([0, 500_00, 2_000_00, 5_000_00])

/** A scale over `ticksCents`, which must be at least two strictly increasing safe integers. */
export function createTickScale(ticksCents: readonly number[]): TickScale {
  if (ticksCents.length < 2) throw new RangeError('A tick scale needs at least two ticks.')
  ticksCents.forEach((cents, i) => {
    if (!Number.isSafeInteger(cents)) throw new TypeError(`Expected integer cents for tick ${i}, got ${cents}`)
    if (i > 0 && cents <= ticksCents[i - 1]!) throw new RangeError('Ticks must be strictly increasing.')
  })
  const values = [...ticksCents]
  const last = values.length - 1
  const ticks = Object.freeze(values.map((cents, plot) => Object.freeze({ plot, cents })))

  function toPlot(cents: number): number {
    if (!Number.isFinite(cents)) throw new TypeError(`Expected a finite amount, got ${cents}`)
    if (cents <= values[0]!) return 0
    if (cents >= values[last]!) return last
    let i = 0
    while (cents >= values[i + 1]!) i++
    const lo = values[i]!
    const hi = values[i + 1]!
    return i + (cents - lo) / (hi - lo)
  }

  return { toPlot, ticks }
}
