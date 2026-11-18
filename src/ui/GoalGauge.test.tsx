import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { gaugeRatio } from './gaugeRatio.ts'
import { GoalGauge } from './GoalGauge.tsx'

const needleEnd = () => {
  const needle = screen.getByTestId('gauge-needle')
  return { x: Number(needle.getAttribute('x2')), y: Number(needle.getAttribute('y2')) }
}
const pivot = () => {
  const needle = screen.getByTestId('gauge-needle')
  return { x: Number(needle.getAttribute('x1')), y: Number(needle.getAttribute('y1')) }
}

describe('gaugeRatio', () => {
  it('is achieved ÷ target', () => {
    expect(gaugeRatio(1_250_000, 2_000_000)).toBe(0.625)
  })

  it('caps at 1 when the achieved amount passes the target', () => {
    expect(gaugeRatio(2_500_000, 2_000_000)).toBe(1)
    expect(gaugeRatio(2_000_000, 2_000_000)).toBe(1)
  })

  it('is 0 for a zero target, without NaN or Infinity', () => {
    expect(gaugeRatio(0, 0)).toBe(0)
    expect(gaugeRatio(5_000, 0)).toBe(0)
  })

  it('is 0 when nothing is achieved', () => {
    expect(gaugeRatio(0, 2_000_000)).toBe(0)
  })
})

describe('GoalGauge', () => {
  it('shows the compact centre and end labels, the caption and a screen-reader summary', () => {
    render(<GoalGauge achievedCents={1_250_000} targetCents={2_000_000} summary="Saved $12,500 of $20,000." />)
    expect(screen.getByText('12K')).toBeInTheDocument()
    expect(screen.getByText('$0')).toBeInTheDocument()
    expect(screen.getByText('$20k')).toBeInTheDocument()
    expect(screen.getByText('Target vs Achievement')).toBeInTheDocument()
    expect(screen.getByText('Saved $12,500 of $20,000.')).toHaveClass('sr-only')
    expect(screen.getByTestId('goal-gauge').querySelector('svg')!.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('draws the track, a fill and a needle at 62.5%, coloured by chart tokens', () => {
    render(<GoalGauge achievedCents={1_250_000} targetCents={2_000_000} summary="s" />)
    expect(screen.getByTestId('goal-gauge')).toHaveAttribute('data-ratio', '0.625')
    expect(screen.getByTestId('gauge-track')).toHaveClass('stroke-chart-previous')
    expect(screen.getByTestId('gauge-fill')).toHaveClass('stroke-chart-current')
    expect(screen.getByTestId('gauge-needle')).toHaveClass('stroke-chart-current')
    // 62.5% of the half turn: right of the pivot and above it.
    const angle = Math.PI * 0.375
    expect(needleEnd().x - pivot().x).toBeCloseTo(40 * Math.cos(angle), 2)
    expect(pivot().y - needleEnd().y).toBeCloseTo(40 * Math.sin(angle), 2)
  })

  it('fills fully and points the needle at the right end when over target', () => {
    render(<GoalGauge achievedCents={2_500_000} targetCents={2_000_000} summary="s" />)
    expect(screen.getByTestId('goal-gauge')).toHaveAttribute('data-ratio', '1')
    expect(screen.getByTestId('gauge-fill').getAttribute('d')).toBe(screen.getByTestId('gauge-track').getAttribute('d'))
    expect(needleEnd()).toEqual({ x: pivot().x + 40, y: pivot().y })
  })

  it.each([
    [0, 0, '0'],
    [5_000, 0, '50'],
  ])('renders an empty gauge for achieved %i and a zero target', (achieved, target, centre) => {
    render(<GoalGauge achievedCents={achieved} targetCents={target} summary="s" />)
    expect(screen.getByTestId('goal-gauge')).toHaveAttribute('data-ratio', '0')
    expect(screen.queryByTestId('gauge-fill')).not.toBeInTheDocument()
    expect(screen.getByTestId('gauge-track')).toBeInTheDocument()
    expect(needleEnd()).toEqual({ x: pivot().x - 40, y: pivot().y })
    expect(screen.getAllByText('$0')).toHaveLength(2)
    expect(screen.getByText(centre)).toBeInTheDocument()
    for (const el of screen.getByTestId('goal-gauge').querySelectorAll('path, line')) {
      for (const attr of ['d', 'x2', 'y2']) expect(el.getAttribute(attr) ?? '').not.toContain('NaN')
    }
  })
})
