import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { toIsoDate } from '../lib/dates.ts'
import { DateBadge } from './DateBadge.tsx'

describe('DateBadge', () => {
  it('shows the month above the day and is labelled for assistive tech', () => {
    render(<DateBadge date={toIsoDate('2023-05-25')} />)
    const badge = screen.getByRole('img', { name: 'Due May 25' })
    expect(badge).toHaveClass('bg-surface', 'rounded-card', 'w-18')
    const [month, day] = [...badge.children]
    expect(month).toHaveTextContent('May')
    expect(month).toHaveClass('text-subtle')
    expect(day).toHaveTextContent('25')
    expect(day).toHaveClass('font-bold', 'text-24')
  })

  it('does not pad single-digit days, and has a smaller size', () => {
    render(<DateBadge date={toIsoDate('2023-06-05')} size="sm" />)
    const badge = screen.getByRole('img', { name: 'Due Jun 5' })
    expect(badge).toHaveClass('w-11')
    expect(badge.children[1]).toHaveTextContent(/^5$/)
  })
})
