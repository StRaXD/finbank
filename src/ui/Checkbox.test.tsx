import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Checkbox } from './Checkbox.tsx'

describe('Checkbox', () => {
  it('links its label to a native checkbox', () => {
    render(<Checkbox label="Keep me signed in" />)
    const box = screen.getByLabelText('Keep me signed in')
    expect(box).toHaveAttribute('type', 'checkbox')
    expect(screen.getByRole('checkbox', { name: 'Keep me signed in' })).toBe(box)
  })

  it('requires a label at the type level', () => {
    // @ts-expect-error label is required
    render(<Checkbox />)
  })

  it('toggles on click, including a click on the label', () => {
    render(<Checkbox label="Keep me signed in" />)
    const box = screen.getByLabelText('Keep me signed in')
    expect(box).not.toBeChecked()
    fireEvent.click(box)
    expect(box).toBeChecked()
    fireEvent.click(screen.getByText('Keep me signed in'))
    expect(box).not.toBeChecked()
  })

  it('respects defaultChecked', () => {
    render(<Checkbox label="Keep me signed in" defaultChecked />)
    expect(screen.getByLabelText('Keep me signed in')).toBeChecked()
  })

  it('is teal when checked', () => {
    render(<Checkbox label="Keep me signed in" />)
    expect(screen.getByLabelText('Keep me signed in')).toHaveClass('checked:bg-primary', 'rounded-checkbox')
  })

  it('wires the error', () => {
    render(<Checkbox label="Accept terms" error="You must accept the terms" />)
    const box = screen.getByLabelText('Accept terms')
    const message = screen.getByText('You must accept the terms')
    expect(message).toHaveClass('text-danger')
    expect(box.getAttribute('aria-describedby')?.split(' ')).toContain(message.id)
    expect(box).toHaveAttribute('aria-invalid', 'true')
    expect(box).toHaveClass('border-danger')
    expect(box).not.toHaveClass('border-faint')
  })

  it('keeps the check visible when checked and disabled', () => {
    render(<Checkbox label="Keep me signed in" defaultChecked disabled />)
    const box = screen.getByLabelText('Keep me signed in')
    expect(box).toBeChecked()
    expect(box).toBeDisabled()
    // The disabled+checked fill outranks the plain disabled fill, so the white check stays visible.
    expect(box).toHaveClass('disabled:bg-disabled', 'disabled:checked:bg-faint', 'disabled:checked:border-faint')
  })

  it('forwards ref, stays keyboard-focusable', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Checkbox label="Keep me signed in" ref={ref} name="persistent" />)
    const box = screen.getByLabelText('Keep me signed in')
    expect(ref.current).toBe(box)
    expect(box).toHaveAttribute('name', 'persistent')
    box.focus()
    expect(box).toHaveFocus()
  })
})
