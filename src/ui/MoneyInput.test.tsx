import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MoneyInput } from './MoneyInput.tsx'

describe('MoneyInput', () => {
  it('is a labelled decimal text field with autocomplete off', () => {
    render(<MoneyInput label="Target Amounts" />)
    const input = screen.getByLabelText('Target Amounts')
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveAttribute('inputmode', 'decimal')
    expect(input).toHaveAttribute('autocomplete', 'off')
  })

  it.each([
    ['$1,234.50', 123450],
    ['13,000.5', 1300050],
    ['0', 0],
    ['', null],
    ['abc', null],
    ['1.234', null],
    ['-5', -500],
  ])('reports %j as %j cents', (text, cents) => {
    const onCentsChange = vi.fn()
    render(<MoneyInput label="Amount" defaultValue="x" onCentsChange={onCentsChange} />)
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: text } })
    expect(onCentsChange).toHaveBeenLastCalledWith(cents)
  })

  it('forwards the ref, name and onChange so react-hook-form can register it', () => {
    const ref = createRef<HTMLInputElement>()
    const onChange = vi.fn()
    render(<MoneyInput label="Amount" name="target" ref={ref} onChange={onChange} />)
    const input = screen.getByLabelText('Amount')
    expect(ref.current).toBe(input)
    expect(input).toHaveAttribute('name', 'target')
    fireEvent.change(input, { target: { value: '12' } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('shows an error inline and marks the field invalid', () => {
    render(<MoneyInput label="Amount" error="Enter an amount, like 1,234.50." />)
    const input = screen.getByLabelText('Amount')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Enter an amount, like 1,234.50.')).toHaveClass('text-danger')
  })
})
