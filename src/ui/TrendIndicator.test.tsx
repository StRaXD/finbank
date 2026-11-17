import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TrendIndicator } from './TrendIndicator.tsx'

const trend = () => screen.getByTestId('trend')
/** The text a screen reader gets: text content minus anything inside an aria-hidden subtree. */
const accessibleText = (el: Element): string =>
  [...el.childNodes]
    .map((n) => (n.nodeType === Node.TEXT_NODE ? (n.textContent ?? '') : n instanceof Element && n.getAttribute('aria-hidden') !== 'true' ? accessibleText(n) : ''))
    .join('')

describe('TrendIndicator', () => {
  it('shows an increase as the percent then a red up arrow, with sr-only direction', () => {
    render(<TrendIndicator changePct={409} />)
    expect(trend()).toHaveTextContent('409% increase')
    const arrow = trend().querySelector('[data-icon="arrowUp"]')
    expect(arrow).toHaveClass('text-danger')
    expect(arrow).toHaveAttribute('aria-hidden', 'true')
    expect(trend().querySelector('[data-icon="arrowDown"]')).toBeNull()
    expect(screen.getByText('increase')).toHaveClass('sr-only')
  })

  it('shows a decrease as a two-digit magnitude and a green down arrow', () => {
    render(<TrendIndicator changePct={-8} />)
    expect(trend()).toHaveTextContent('08% decrease')
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

  describe('tile variant', () => {
    it('shows the percent with a "*" marker in text-14 muted, then the arrow on the same line', () => {
      render(<TrendIndicator changePct={409} variant="tile" />)
      expect(trend()).toHaveTextContent('409%* increase')
      expect(trend().firstElementChild).toHaveTextContent('409%*')
      expect(trend().firstElementChild).toHaveClass('text-14', 'text-muted')
      expect(trend().querySelector('[data-icon="arrowUp"]')).toHaveClass('text-danger')
      expect(screen.getByText('increase')).toHaveClass('sr-only')
      expect(trend().parentElement).toHaveClass('items-start')
    })

    it('hides the "*" marker from screen readers', () => {
      render(<TrendIndicator changePct={409} variant="tile" />)
      expect(accessibleText(trend())).toBe('409% increase')
      expect(accessibleText(trend())).not.toContain('*')
    })

    it('shows a decrease with a green down arrow', () => {
      render(<TrendIndicator changePct={-11} variant="tile" />)
      expect(trend()).toHaveTextContent('11%* decrease')
      expect(trend().querySelector('[data-icon="arrowDown"]')).toHaveClass('text-positive')
    })

    it('shows 0 as a muted "00%*" with no arrow and no direction text', () => {
      render(<TrendIndicator changePct={0} variant="tile" />)
      expect(trend()).toHaveTextContent(/^00%\*$/)
      expect(trend().firstElementChild).toHaveClass('text-muted')
      expect(trend().querySelector('svg')).toBeNull()
    })
  })

  it('defaults to the card variant: text-16 with no "*" marker', () => {
    render(<TrendIndicator changePct={15} />)
    expect(screen.getByText('15%')).toHaveClass('text-16', 'font-medium', 'text-ink-2')
    expect(trend().parentElement).toHaveClass('items-end')
    expect(trend()).not.toHaveTextContent('*')
  })
})
