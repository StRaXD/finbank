import { render, screen, within } from '@testing-library/react'
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
})
