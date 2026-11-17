import { describe, expect, it } from 'vitest'
import { BAR_TICKS, SAVING_TICKS, createTickScale, fitLadderTicks } from './chartScale.ts'

describe('createTickScale', () => {
  const scale = createTickScale(BAR_TICKS)

  it('exposes the ticks evenly spaced at 0…n−1', () => {
    expect(scale.ticks).toEqual([
      { plot: 0, cents: 0 },
      { plot: 1, cents: 2_000_00 },
      { plot: 2, cents: 10_000_00 },
      { plot: 3, cents: 50_000_00 },
      { plot: 4, cents: 250_000_00 },
    ])
  })

  it.each([
    [0, 0],
    [1_000_00, 0.5],
    [2_000_00, 1],
    [6_000_00, 1.5],
    [30_000_00, 2.5],
    [250_000_00, 4],
    [300_000_00, 4],
    [-1, 0],
  ])('maps %i cents to %d', (cents, plot) => {
    expect(scale.toPlot(cents)).toBeCloseTo(plot, 10)
  })

  it('maps each tick to its own position', () => {
    for (const tick of scale.ticks) expect(scale.toPlot(tick.cents)).toBe(tick.plot)
  })

  it('pins the saving ticks', () => {
    expect(createTickScale(SAVING_TICKS).ticks.map((t) => t.cents)).toEqual([0, 500_00, 2_000_00, 5_000_00])
    expect(createTickScale(SAVING_TICKS).toPlot(1_250_00)).toBeCloseTo(1.5, 10)
  })

  it('rejects malformed tick lists and non-finite amounts', () => {
    expect(() => createTickScale([0])).toThrow(RangeError)
    expect(() => createTickScale([0, 0])).toThrow(RangeError)
    expect(() => createTickScale([0, 1.5])).toThrow(TypeError)
    expect(() => scale.toPlot(Number.NaN)).toThrow(TypeError)
  })
})

describe('fitLadderTicks', () => {
  const ladder = (k: number) => [0, 2, 10, 50, 250].map((dollars) => dollars * 100 * 10 ** k)

  it.each([
    ['small data ($40)', 0, 40_00],
    ['all zero', 0, 0],
    ['exactly the k = 0 top ($250)', 0, 250_00],
    ['one cent over $250', 1, 250_01],
    ['the weekly seed max (~$2,995)', 2, 2_994_99],
    ['the monthly seed max ($14,800)', 2, 14_800_00],
    ['exactly $25,000', 2, 25_000_00],
    ['$25,000.01', 3, 25_000_01],
    ['$250,000', 3, 250_000_00],
    ['$250,000.01', 4, 250_000_01],
  ])('fits %s to ladder k = %i', (_name, k, maxCents) => {
    expect(fitLadderTicks(maxCents)).toEqual(ladder(k))
  })

  it('is BAR_TICKS at k = 3', () => {
    expect(fitLadderTicks(50_000_00)).toEqual(BAR_TICKS)
  })

  it('treats a negative max as k = 0 and rejects a non-finite max', () => {
    expect(fitLadderTicks(-5_00)).toEqual(ladder(0))
    expect(() => fitLadderTicks(Number.NaN)).toThrow(TypeError)
    expect(() => fitLadderTicks(Number.POSITIVE_INFINITY)).toThrow(TypeError)
  })

  it('gives a valid tick scale', () => {
    const scale = createTickScale(fitLadderTicks(2_994_99))
    expect(scale.toPlot(2_994_99)).toBeCloseTo(2 + (2_994_99 - 1_000_00) / (5_000_00 - 1_000_00), 10)
  })
})
