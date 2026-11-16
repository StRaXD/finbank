import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormStatus } from './FormStatus.tsx'

describe('FormStatus', () => {
  it('renders the message in a status region in the positive colour', () => {
    render(<FormStatus message="Profile updated" />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Profile updated')
    expect(status).toHaveClass('text-positive')
  })

  it.each([undefined, '', '   '])('keeps an empty status region when the message is %j', (message) => {
    render(<FormStatus message={message} />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('announces through the same mounted region when a message arrives', () => {
    const { rerender } = render(<FormStatus />)
    const region = screen.getByRole('status')
    expect(region).toBeEmptyDOMElement()
    rerender(<FormStatus message="Profile updated" />)
    expect(screen.getByRole('status')).toBe(region)
    expect(region).toHaveTextContent('Profile updated')
    rerender(<FormStatus message="" />)
    expect(screen.getByRole('status')).toBe(region)
    expect(region).toBeEmptyDOMElement()
  })
})
