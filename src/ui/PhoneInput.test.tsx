import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PhoneInput } from './PhoneInput.tsx'

describe('PhoneInput', () => {
  it('labels the code input with the visible label and the number input "{label} number"', () => {
    render(
      <PhoneInput
        label="Phone Number"
        codeProps={{ defaultValue: '+880' }}
        numberProps={{ defaultValue: '51547 58868' }}
      />,
    )
    const code = screen.getByLabelText('Phone Number')
    const number = screen.getByRole('textbox', { name: 'Phone Number number' })
    expect(code).toHaveValue('+880')
    expect(number).toHaveValue('51547 58868')
    expect(code).toHaveAttribute('type', 'tel')
    expect(number).toHaveAttribute('type', 'tel')
    expect(screen.getByText('|')).toHaveAttribute('aria-hidden', 'true')
    // The divider sits between the two inputs.
    const divider = screen.getByText('|')
    expect(code.compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(divider.compareDocumentPosition(number) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('forwards refs and change handlers to each part (react-hook-form register)', () => {
    const codeRef = createRef<HTMLInputElement>()
    const numberRef = createRef<HTMLInputElement>()
    const onCode = vi.fn()
    const onNumber = vi.fn()
    render(
      <PhoneInput
        label="Phone"
        codeProps={{ ref: codeRef, name: 'phoneCountryCode', onChange: onCode }}
        numberProps={{ ref: numberRef, name: 'phoneNumber', onChange: onNumber }}
      />,
    )
    expect(codeRef.current).toBe(screen.getByLabelText('Phone'))
    expect(numberRef.current).toBe(screen.getByLabelText('Phone number'))
    expect(codeRef.current).toHaveAttribute('name', 'phoneCountryCode')
    fireEvent.change(codeRef.current!, { target: { value: '+44' } })
    fireEvent.change(numberRef.current!, { target: { value: '123' } })
    expect(onCode).toHaveBeenCalledOnce()
    expect(onNumber).toHaveBeenCalledOnce()
  })

  it('wires an error to both parts in text-danger', () => {
    render(<PhoneInput label="Phone" error="Phone number is required." />)
    const message = screen.getByText('Phone number is required.')
    expect(message).toHaveClass('text-danger')
    for (const input of [screen.getByLabelText('Phone'), screen.getByLabelText('Phone number')]) {
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAccessibleDescription('Phone number is required.')
    }
    expect(screen.getByTestId('phone-input')).toHaveClass('border-danger')
  })

  it('has no error wiring without an error', () => {
    render(<PhoneInput label="Phone" />)
    for (const input of [screen.getByLabelText('Phone'), screen.getByLabelText('Phone number')]) {
      expect(input).not.toHaveAttribute('aria-invalid')
      expect(input).not.toHaveAttribute('aria-describedby')
    }
  })

  it('uses a transparent border when borderless and the default border otherwise', () => {
    const { unmount } = render(<PhoneInput label="Phone" variant="borderless" />)
    expect(screen.getByTestId('phone-input')).toHaveClass('border-transparent', 'px-6')
    unmount()
    render(<PhoneInput label="Phone" />)
    expect(screen.getByTestId('phone-input')).toHaveClass('border-border', 'focus-within:border-ink-2', 'px-4')
  })

  it('styles the borderless variant like the Settings fields (ink-2 label, 12px gap, subtle text)', () => {
    render(<PhoneInput label="Phone" variant="borderless" />)
    expect(screen.getByText('Phone', { selector: 'label' })).toHaveClass('text-ink-2', 'mb-3')
    for (const input of [screen.getByLabelText('Phone'), screen.getByLabelText('Phone number')]) {
      expect(input).toHaveClass('text-subtle')
    }
    expect(screen.getByText('|')).toHaveClass('text-subtle')
    expect(screen.getByLabelText('Phone')).toHaveClass('w-10')
  })

  it('keeps the default variant label and text in ink tones', () => {
    render(<PhoneInput label="Phone" />)
    expect(screen.getByText('Phone', { selector: 'label' })).toHaveClass('text-ink', 'mb-2')
    expect(screen.getByLabelText('Phone')).toHaveClass('text-ink-2')
  })

  it('uses a caller id for the code input', () => {
    render(<PhoneInput label="Phone" codeProps={{ id: 'phone' }} error="Required" />)
    const code = screen.getByLabelText('Phone')
    expect(code.id).toBe('phone')
    expect(code).toHaveAttribute('aria-describedby', 'phone-error')
  })

  it('requires a label at the type level', () => {
    // @ts-expect-error label is required
    render(<PhoneInput />)
  })
})
