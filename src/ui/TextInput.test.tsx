import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TextInput } from './TextInput.tsx'

describe('TextInput', () => {
  it('links its label to the field', () => {
    render(<TextInput label="Email Address" placeholder="johndoe@email.com" />)
    const input = screen.getByLabelText('Email Address')
    expect(input.tagName).toBe('INPUT')
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveAttribute('placeholder', 'johndoe@email.com')
    expect(input).toHaveClass('h-12', 'rounded-input', 'border-border', 'placeholder:text-faint', 'text-ink-2')
  })

  it('uses the default border, turning ink-2 when focused or filled', () => {
    render(<TextInput label="Email" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveClass('border-border', 'focus:border-ink-2', 'not-placeholder-shown:border-ink-2')
  })

  it('gives an empty field with no placeholder a blank placeholder so :placeholder-shown matches', () => {
    render(<TextInput label="Email" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveValue('')
    expect(input).toHaveAttribute('placeholder', ' ')
    expect(input.matches(':placeholder-shown')).toBe(true)
  })

  it('lets a caller placeholder win', () => {
    render(<TextInput label="Email" placeholder="johndoe@email.com" />)
    expect(screen.getByLabelText('Email')).toHaveAttribute('placeholder', 'johndoe@email.com')
  })

  it('falls back to a generated id when id is empty', () => {
    render(<TextInput label="Email" id="" error="Required" />)
    const input = screen.getByLabelText('Email')
    expect(input.id).not.toBe('')
    expect(input).toHaveAttribute('aria-describedby', `${input.id}-error`)
  })

  it('requires a label at the type level', () => {
    // @ts-expect-error label is required
    render(<TextInput />)
  })

  it('has no error wiring without an error', () => {
    render(<TextInput label="Email Address" />)
    const input = screen.getByLabelText('Email Address')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toHaveAttribute('aria-describedby')
  })

  it('renders the error below the field and links it with aria-describedby and aria-invalid', () => {
    render(<TextInput label="Email Address" error="Enter a valid email address" />)
    const input = screen.getByLabelText('Email Address')
    const message = screen.getByText('Enter a valid email address')
    expect(message).toHaveClass('text-danger')
    expect(message.id).not.toBe('')
    expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(message.id)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveClass('border-danger')
    expect(input).not.toHaveClass('border-border', 'focus:border-ink-2', 'not-placeholder-shown:border-ink-2')
    expect(input).toHaveAccessibleDescription('Enter a valid email address')
    // Rendered after the field in document order.
    expect(input.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('merges a caller aria-describedby with the error id', () => {
    render(<TextInput label="Email" aria-describedby="hint" error="Required" />)
    const ids = screen.getByLabelText('Email').getAttribute('aria-describedby')?.split(' ')
    expect(ids).toContain('hint')
    expect(ids).toHaveLength(2)
  })

  it('uses a caller id when given', () => {
    render(<TextInput label="Email" id="email" error="Required" />)
    const input = screen.getByLabelText('Email')
    expect(input.id).toBe('email')
    expect(input).toHaveAttribute('aria-describedby', 'email-error')
  })

  it('renders the borderless variant without a visible border', () => {
    render(<TextInput label="Full name" variant="borderless" defaultValue="Tanzir Rahman" />)
    const input = screen.getByLabelText('Full name')
    expect(input).toHaveClass('border-transparent')
    expect(input).not.toHaveClass('border-border')
    expect(input).toHaveValue('Tanzir Rahman')
  })

  it('shows a danger border on the borderless variant with an error', () => {
    render(<TextInput label="Full name" variant="borderless" error="Name is required" />)
    const input = screen.getByLabelText('Full name')
    expect(input).toHaveClass('border-danger')
    expect(input).not.toHaveClass('border-transparent')
  })

  it('forwards ref and native props (react-hook-form register shape)', () => {
    const ref = createRef<HTMLInputElement>()
    const onChange = vi.fn()
    const onBlur = vi.fn()
    render(<TextInput label="Email" ref={ref} name="email" type="email" onChange={onChange} onBlur={onBlur} />)
    const input = screen.getByLabelText('Email')
    expect(ref.current).toBe(input)
    expect(input).toHaveAttribute('name', 'email')
    expect(input).toHaveAttribute('type', 'email')
    fireEvent.change(input, { target: { value: 'a@b.co' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onBlur).toHaveBeenCalledTimes(1)
  })

  it('is focusable', () => {
    render(<TextInput label="Email" />)
    const input = screen.getByLabelText('Email')
    input.focus()
    expect(input).toHaveFocus()
  })
})
