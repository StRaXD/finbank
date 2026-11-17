import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AsyncSection, type AsyncQuery } from './AsyncSection.tsx'
import { EmptyState } from './EmptyState.tsx'
import { Skeleton } from './Skeleton.tsx'

function query(over: Partial<AsyncQuery<string[]>>): AsyncQuery<string[]> {
  return { status: 'pending', data: undefined, error: null, isFetching: false, refetch: vi.fn(), ...over }
}

function renderSection(q: AsyncQuery<string[]>) {
  const children = vi.fn((items: string[]) => <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>)
  render(
    <AsyncSection query={q} isEmpty={(items) => items.length === 0} emptyMessage="Nothing here yet.">
      {children}
    </AsyncSection>,
  )
  return children
}

describe('AsyncSection', () => {
  it('shows a busy skeleton while loading, without children', () => {
    const children = renderSection(query({ status: 'pending', isFetching: true }))
    const busy = screen.getByText('Loading…').parentElement as HTMLElement
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Loading…')).toHaveClass('sr-only')
    expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-hidden', 'true')
    expect(busy.contains(screen.getByTestId('skeleton'))).toBe(true)
    expect(children).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows only the empty message when isEmpty is true', () => {
    const children = renderSection(query({ status: 'success', data: [] }))
    expect(screen.getByText('Nothing here yet.')).toHaveClass('text-muted', 'text-16')
    expect(children).not.toHaveBeenCalled()
    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
  })

  it('renders children with the data', () => {
    renderSection(query({ status: 'success', data: ['Rent', 'Food'] }))
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Rent', 'Food'])
  })

  it('renders children when no isEmpty is given, even for an empty list', () => {
    render(
      <AsyncSection query={query({ status: 'success', data: [] })} emptyMessage="Nothing here yet.">
        {() => <p>children</p>}
      </AsyncSection>,
    )
    expect(screen.getByText('children')).toBeInTheDocument()
  })

  it('shows the error with a Retry that calls refetch once', () => {
    const refetch = vi.fn()
    const children = renderSection(query({ status: 'error', error: { message: 'Could not load.' }, refetch }))
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load.')
    expect(screen.getByRole('alert')).toHaveClass('text-danger')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledTimes(1)
    expect(children).not.toHaveBeenCalled()
  })

  it.each([{ message: '' }, { message: '   ' }, null])('falls back to a generic message for error %j', (error) => {
    renderSection(query({ status: 'error', error }))
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
  })

  it('disables Retry while refetching', () => {
    const refetch = vi.fn()
    renderSection(query({ status: 'error', error: { message: 'Nope' }, isFetching: true, refetch }))
    const retry = screen.getByRole('button', { name: 'Retry' })
    expect(retry).toBeDisabled()
    fireEvent.click(retry)
    expect(refetch).not.toHaveBeenCalled()
  })

  it('keeps showing cached data when a background refetch fails', () => {
    renderSection(query({ status: 'error', data: ['Rent'], error: { message: 'Could not load.' } }))
    expect(screen.getByRole('listitem')).toHaveTextContent('Rent')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })
})

describe('Skeleton', () => {
  it('renders three hidden pulsing bars by default', () => {
    render(<Skeleton />)
    expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-hidden', 'true')
    const lines = screen.getAllByTestId('skeleton-line')
    expect(lines).toHaveLength(3)
    for (const line of lines) expect(line).toHaveClass('animate-pulse', 'bg-border')
  })

  it('renders the requested number of lines', () => {
    render(<Skeleton lines={5} />)
    expect(screen.getAllByTestId('skeleton-line')).toHaveLength(5)
  })
})

describe('EmptyState', () => {
  it('renders one muted line', () => {
    render(<EmptyState message="No bills yet." />)
    expect(screen.getByText('No bills yet.')).toHaveClass('text-16', 'text-muted')
  })
})
