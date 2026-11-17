import { describe, expect, it } from 'vitest'
import { BAR_TICKS, SAVING_TICKS, createTickScale } from './chartScale.ts'

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
