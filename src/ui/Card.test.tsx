import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card } from './Card.tsx'

describe('Card', () => {
  it('renders the title as an h2 above the card, with actions and children', () => {
    render(
      <Card title="Upcoming Bill" actions={<button type="button">View All</button>}>
        <p>Body</p>
      </Card>,
    )
    const heading = screen.getByRole('heading', { level: 2, name: 'Upcoming Bill' })
    expect(heading).toHaveClass('text-22', 'text-subtle')
    expect(screen.getByRole('region', { name: 'Upcoming Bill' })).toBeInTheDocument()
    const body = screen.getByTestId('card-body')
    expect(body).toHaveClass('rounded-card', 'bg-card', 'shadow-card', 'p-6')
    expect(body).toHaveTextContent('Body')
    const action = screen.getByRole('button', { name: 'View All' })
    expect(heading.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(body.contains(action)).toBe(false)
    expect(heading.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders just the card without a title or actions', () => {
    render(
      <Card>
        <p>Only body</p>
      </Card>,
    )
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByTestId('card-body')).toHaveTextContent('Only body')
    expect(screen.getByTestId('card-body').parentElement?.children).toHaveLength(1)
  })

  it('renders actions without a title', () => {
    render(
      <Card actions={<button type="button">Edit</button>}>
        <p>Body</p>
      </Card>,
    )
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it.each([false, null])('treats actions=%j as no actions (no empty header row)', (actions) => {
    render(
      <Card actions={actions}>
        <p>Body</p>
      </Card>,
    )
    expect(screen.getByTestId('card-body').parentElement?.children).toHaveLength(1)
  })
})
