import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LoadMore } from './LoadMore.tsx'

describe('LoadMore', () => {
  it('renders nothing when there is no more', () => {
    const { container } = render(<LoadMore hasMore={false} loading={false} onClick={() => {}} error="x" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders an enabled primary button that calls onClick', () => {
    const onClick = vi.fn()
    render(<LoadMore hasMore loading={false} onClick={onClick} />)
    const button = screen.getByRole('button', { name: 'Load More' })
    expect(button).toBeEnabled()
    expect(button).toHaveClass('bg-primary')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is aria-disabled while loading, ignores clicks and keeps focus', () => {
    const onClick = vi.fn()
    const { rerender } = render(<LoadMore hasMore loading={false} onClick={onClick} />)
    const button = screen.getByRole('button', { name: 'Load More' })
    button.focus()
    rerender(<LoadMore hasMore loading onClick={onClick} />)
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).not.toHaveAttribute('disabled')
    expect(button).toHaveClass('aria-disabled:bg-disabled')
    expect(button).toHaveFocus()
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
    rerender(<LoadMore hasMore loading={false} onClick={onClick} />)
    expect(button).not.toHaveAttribute('aria-disabled')
    expect(button).toHaveFocus()
  })

  it('shows the error as a danger alert and retries from the button', () => {
    const onClick = vi.fn()
    render(<LoadMore hasMore loading={false} onClick={onClick} error="Could not load more." />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Could not load more.')
    expect(alert).toHaveClass('text-danger')
    fireEvent.click(screen.getByRole('button', { name: 'Load More' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
