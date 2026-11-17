import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TrendIndicator } from './TrendIndicator.tsx'

const trend = () => screen.getByTestId('trend')

describe('TrendIndicator', () => {
  it('shows an increase as the percent then a red up arrow, with sr-only direction', () => {
    render(<TrendIndicator changePct={409} />)
    expect(trend()).toHaveTextContent('409%increase')
    const arrow = trend().querySelector('[data-icon="arrowUp"]')
    expect(arrow).toHaveClass('text-danger')
    expect(arrow).toHaveAttribute('aria-hidden', 'true')
    expect(trend().querySelector('[data-icon="arrowDown"]')).toBeNull()
    expect(screen.getByText('increase')).toHaveClass('sr-only')
  })

  it('shows a decrease as a two-digit magnitude and a green down arrow', () => {
    render(<TrendIndicator changePct={-8} />)
    expect(trend()).toHaveTextContent('08%decrease')
    expect(trend().querySelector('[data-icon="arrowDown"]')).toHaveClass('text-positive')
    expect(trend().querySelector('[data-icon="arrowUp"]')).toBeNull()
  })

  it('shows 0 as a grey "00%" with no arrow and no direction text', () => {
    render(<TrendIndicator changePct={0} />)
    expect(trend()).toHaveTextContent(/^00%$/)
    expect(screen.getByText('00%')).toHaveClass('text-muted')
    expect(trend().querySelector('svg')).toBeNull()
  })

  it('shows the optional caption below in small grey text', () => {
    const { rerender } = render(<TrendIndicator changePct={15} caption="Compare to last month" />)
    expect(screen.getByText('Compare to last month')).toHaveClass('text-12', 'text-muted')
    rerender(<TrendIndicator changePct={15} />)
    expect(screen.queryByText('Compare to last month')).not.toBeInTheDocument()
  })
})
