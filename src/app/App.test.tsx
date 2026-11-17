import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import wordmarkTeal from '../assets/brands/wordmark-teal.svg'
import wordmarkWhite from '../assets/brands/wordmark-white.svg'
import App from './App.tsx'

// The specimen weight for each step follows Typography-color.png (18 and 22 are bold).
const steps = [
  { size: 12, weight: 'font-normal' },
  { size: 14, weight: 'font-normal' },
  { size: 16, weight: 'font-normal' },
  { size: 18, weight: 'font-bold' },
  { size: 20, weight: 'font-medium' },
  { size: 22, weight: 'font-bold' },
  { size: 24, weight: 'font-semibold' },
]

describe('App token specimen', () => {
  it.each(steps)('renders the $size step with its text token class', ({ size, weight }) => {
    render(<App />)
    const el = screen.getByTestId(`type-step-${size}`)
    expect(el).toHaveClass(`text-${size}`, weight)
  })

  it('renders the teal wordmark on the card and the white one on the sidebar', () => {
    render(<App />)
    const teal = within(screen.getByTestId('specimen-card')).getByRole('img', { name: 'FINEbank.IO' })
    const white = within(screen.getByTestId('specimen-sidebar')).getByRole('img', { name: 'FINEbank.IO' })
    expect(teal).toHaveAttribute('src', wordmarkTeal)
    expect(white).toHaveAttribute('src', wordmarkWhite)
    expect(wordmarkTeal).not.toBe(wordmarkWhite)
  })

  it('renders the components specimen with every primitive', () => {
    render(<App />)
    const section = within(screen.getByTestId('specimen-components'))
    expect(section.getAllByRole('button', { name: 'Login' })).toHaveLength(2)
    expect(section.getAllByRole('button', { name: 'Continue with Google' })).toHaveLength(2)
    expect(section.getByLabelText('Email Address')).toBeInTheDocument()
    expect(section.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(section.getByLabelText('Keep me signed in')).toBeChecked()
    expect(section.getByRole('status')).toHaveTextContent('Profile updated')
  })

  it('renders the cards, the three async states and the dialog openers', () => {
    render(<App />)
    const section = within(screen.getByTestId('specimen-cards'))
    expect(section.getByRole('heading', { level: 2, name: 'Upcoming Bill' })).toBeInTheDocument()
    expect(section.getByRole('button', { name: 'View All' })).toBeInTheDocument()
    expect(section.getByText('Card without a title')).toBeInTheDocument()
    expect(section.getByText('Loading…').parentElement).toHaveAttribute('aria-busy', 'true')
    expect(section.getByText('No transactions yet.')).toBeInTheDocument()
    expect(section.getByRole('alert')).toHaveTextContent('Could not load transactions.')

    fireEvent.click(section.getByRole('button', { name: 'Open modal' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Target Amounts')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(section.getByRole('button', { name: 'Open confirm dialog' }))
    expect(screen.getByRole('dialog', { name: 'Remove account?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
