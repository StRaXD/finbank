import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { PasswordInput } from './PasswordInput.tsx'

const iconOf = (button: HTMLElement) => button.querySelector('[data-icon]')?.getAttribute('data-icon')

describe('PasswordInput', () => {
  it('links its label to a password field', () => {
    render(<PasswordInput label="Password" />)
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('is a 48px field', () => {
    render(<PasswordInput label="Password" />)
    expect(screen.getByLabelText('Password')).toHaveClass('h-12')
  })

  it('requires a label at the type level', () => {
    // @ts-expect-error label is required
    render(<PasswordInput />)
  })

  it('toggles password -> text -> password, swapping icon, aria-label and aria-pressed', () => {
    render(<PasswordInput label="Password" />)
    const input = screen.getByLabelText('Password')

    const show = screen.getByRole('button', { name: 'Show password' })
    expect(show).toHaveAttribute('type', 'button')
    expect(show).toHaveAttribute('aria-pressed', 'false')
    expect(iconOf(show)).toBe('eye')

    fireEvent.click(show)
    expect(input).toHaveAttribute('type', 'text')
    const hide = screen.getByRole('button', { name: 'Hide password' })
    expect(hide).toHaveAttribute('aria-pressed', 'true')
    expect(iconOf(hide)).toBe('eyeOff')

    fireEvent.click(hide)
    expect(input).toHaveAttribute('type', 'password')
    const showAgain = screen.getByRole('button', { name: 'Show password' })
    expect(showAgain).toHaveAttribute('aria-pressed', 'false')
    expect(iconOf(showAgain)).toBe('eye')
  })

  it('wires the error like TextInput', () => {
    render(<PasswordInput label="Password" error="Password is required" />)
    const input = screen.getByLabelText('Password')
    const message = screen.getByText('Password is required')
    expect(message).toHaveClass('text-danger')
    expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(message.id)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveClass('border-danger')
    expect(input).not.toHaveClass('border-border', 'focus:border-ink-2', 'not-placeholder-shown:border-ink-2')
  })

  it('defaults a blank placeholder and keeps the ink-2 classes off an errored field', () => {
    render(<PasswordInput label="Password" />)
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('placeholder', ' ')
    expect(input).toHaveClass('border-border', 'focus:border-ink-2', 'not-placeholder-shown:border-ink-2')
  })

  it('disables the toggle with the field so it cannot reveal the value', () => {
    render(<PasswordInput label="Password" disabled defaultValue="secret" />)
    const input = screen.getByLabelText('Password')
    const toggle = screen.getByRole('button', { name: 'Show password' })
    expect(toggle).toBeDisabled()
    expect(toggle).toHaveClass('enabled:hover:text-ink-2')
    fireEvent.click(toggle)
    expect(input).toHaveAttribute('type', 'password')
    toggle.focus()
    expect(toggle).not.toHaveFocus()
  })

  it('forwards ref and native props', () => {
    const ref = createRef<HTMLInputElement>()
    render(<PasswordInput label="Password" ref={ref} name="password" autoComplete="current-password" />)
    const input = screen.getByLabelText('Password')
    expect(ref.current).toBe(input)
    expect(input).toHaveAttribute('name', 'password')
    expect(input).toHaveAttribute('autocomplete', 'current-password')
  })

  it('keeps the field and toggle focusable', () => {
    render(<PasswordInput label="Password" />)
    const input = screen.getByLabelText('Password')
    input.focus()
    expect(input).toHaveFocus()
    const toggle = screen.getByRole('button', { name: 'Show password' })
    toggle.focus()
    expect(toggle).toHaveFocus()
  })
})
