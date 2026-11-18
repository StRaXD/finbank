import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Dropdown, type DropdownVariant } from './Dropdown.tsx'

const options = [
  { value: 'year', label: 'Monthly Comparison' },
  { value: 'week', label: 'Weekly Comparison' },
] as const

type Period = (typeof options)[number]['value']

function Harness({ onChange, variant = 'plain' }: { onChange?: (value: Period) => void; variant?: Exclude<DropdownVariant, 'field'> }) {
  const [value, setValue] = useState<Period>('year')
  return (
    <>
      <Dropdown
        label="Comparison period"
        options={options}
        value={value}
        variant={variant}
        onChange={(next) => {
          onChange?.(next)
          setValue(next)
        }}
      />
      <button type="button">Outside</button>
    </>
  )
}

const trigger = () => screen.getByRole('button', { name: /Comparison period/ })

describe('Dropdown', () => {
  it('shows the selected option on a labelled, collapsed trigger', () => {
    render(<Harness />)
    expect(trigger()).toHaveAccessibleName('Comparison period Monthly Comparison')
    expect(trigger()).toHaveTextContent('Monthly Comparison')
    expect(trigger()).toHaveAttribute('aria-haspopup', 'listbox')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(trigger()).toHaveClass('text-16', 'font-bold', 'text-ink')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('renders the filled variant as a grey 32px box with a 16px chevron, and still selects', () => {
    const onChange = vi.fn()
    render(<Harness variant="filled" onChange={onChange} />)
    expect(trigger()).toHaveClass('h-8', 'px-4', 'border', 'border-border', 'bg-surface', 'rounded-button', 'text-14', 'text-ink-2')
    expect(trigger()).not.toHaveClass('font-bold')
    const chevron = trigger().querySelector('svg')
    expect(chevron).toHaveAttribute('width', '16')
    expect(chevron).toHaveAttribute('height', '16')
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('option', { name: 'Weekly Comparison' }))
    expect(onChange).toHaveBeenCalledWith('week')
    expect(trigger()).toHaveTextContent('Weekly Comparison')
  })

  it('renders the subtle variant as a small grey label with a 16px chevron', () => {
    render(<Harness variant="subtle" />)
    expect(trigger()).toHaveClass('text-12', 'text-ink-2')
    expect(trigger()).not.toHaveClass('font-bold', 'bg-surface', 'border')
    expect(trigger().querySelector('svg')).toHaveAttribute('width', '16')
  })

  it('opens on click, selects an option and closes', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.click(trigger())
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    const listbox = screen.getByRole('listbox', { name: 'Comparison period' })
    expect(listbox).toHaveFocus()
    expect(screen.getByRole('option', { name: 'Monthly Comparison' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('option', { name: 'Weekly Comparison' }))
    expect(onChange).toHaveBeenCalledWith('week')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(trigger()).toHaveTextContent('Weekly Comparison')
    expect(trigger()).toHaveFocus()
  })

  it('opens from the trigger with ArrowUp too, on the selected option', () => {
    render(<Harness onChange={vi.fn()} />)
    trigger().focus()
    fireEvent.keyDown(trigger(), { key: 'ArrowUp' })
    const listbox = screen.getByRole('listbox')
    expect(listbox).toHaveFocus()
    expect(listbox).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0]!.id)
  })

  it('is fully operable by keyboard: pick Weekly, then return to Monthly', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    trigger().focus()

    fireEvent.keyDown(trigger(), { key: 'ArrowDown' })
    const listbox = screen.getByRole('listbox')
    expect(listbox).toHaveFocus()
    expect(listbox).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0]!.id)
    fireEvent.keyDown(listbox, { key: 'ArrowDown' })
    expect(listbox).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1]!.id)
    // Clamped at the last option.
    fireEvent.keyDown(listbox, { key: 'ArrowDown' })
    expect(listbox).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1]!.id)
    fireEvent.keyDown(listbox, { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith('week')
    expect(trigger()).toHaveTextContent('Weekly Comparison')
    expect(trigger()).toHaveFocus()

    // Opening again starts on the selected option; ArrowUp and Space pick Monthly.
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' })
    const reopened = screen.getByRole('listbox')
    expect(reopened).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1]!.id)
    fireEvent.keyDown(reopened, { key: 'ArrowUp' })
    fireEvent.keyDown(reopened, { key: ' ' })
    expect(onChange).toHaveBeenLastCalledWith('year')
    expect(trigger()).toHaveTextContent('Monthly Comparison')
    expect(trigger()).toHaveFocus()
  })

  it('supports Home and End', () => {
    render(<Harness />)
    fireEvent.click(trigger())
    const listbox = screen.getByRole('listbox')
    const [first, second] = screen.getAllByRole('option')
    fireEvent.keyDown(listbox, { key: 'End' })
    expect(listbox).toHaveAttribute('aria-activedescendant', second!.id)
    fireEvent.keyDown(listbox, { key: 'Home' })
    expect(listbox).toHaveAttribute('aria-activedescendant', first!.id)
  })

  it('closes on Escape without changing the value and refocuses the trigger', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.click(trigger())
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' })
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
    expect(trigger()).toHaveFocus()
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
  })

  it('does not call onChange when the selected option is picked again', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.click(trigger())
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Enter' })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('closes on an outside click, and when the trigger is clicked again', () => {
    render(<Harness />)
    fireEvent.click(trigger())
    fireEvent.pointerDown(screen.getByRole('option', { name: 'Weekly Comparison' }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    fireEvent.click(trigger())
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.click(trigger())
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes on Tab', () => {
    render(<Harness />)
    fireEvent.click(trigger())
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Tab' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()
  })
})

const typeOptions = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
] as const

type Kind = (typeof typeOptions)[number]['value']

function FieldHarness({
  initial = '',
  error,
  onBlur,
  onChange,
  buttonRef,
}: {
  initial?: Kind | ''
  error?: string
  onBlur?: () => void
  onChange?: (value: Kind) => void
  buttonRef?: (node: HTMLButtonElement | null) => void
}) {
  const [value, setValue] = useState<Kind | ''>(initial)
  return (
    <>
      <Dropdown
        variant="field"
        label="Account Type"
        placeholder="Select type…"
        name="type"
        options={typeOptions}
        value={value}
        error={error}
        onBlur={onBlur}
        ref={buttonRef}
        onChange={(next) => {
          onChange?.(next)
          setValue(next)
        }}
      />
      <button type="button">Outside</button>
    </>
  )
}

const combobox = () => screen.getByRole('combobox', { name: 'Account Type' })

describe('Dropdown field variant', () => {
  it('is a 56px bordered combobox named by its visible label, showing the placeholder in subtle', () => {
    render(<FieldHarness />)
    expect(combobox()).toHaveAccessibleName('Account Type')
    expect(screen.getByText('Account Type')).toBeVisible()
    expect(screen.getByText('Account Type')).toHaveClass('text-16', 'font-medium', 'text-ink-2', 'mb-2')
    expect(combobox()).toHaveClass('h-14', 'w-full', 'px-6', 'border', 'rounded-input', 'border-border')
    expect(combobox()).toHaveAttribute('name', 'type')
    expect(combobox()).toHaveAttribute('aria-haspopup', 'listbox')
    expect(combobox()).not.toHaveAttribute('aria-invalid')
    expect(combobox()).not.toHaveAttribute('aria-describedby')
    expect(combobox()).not.toHaveAttribute('aria-required')
    const placeholder = within(combobox()).getByText('Select type…')
    expect(placeholder).toHaveClass('text-subtle')
  })

  it('opens with no option selected and a full-width popup, then shows the pick in ink-2', () => {
    const onChange = vi.fn()
    render(<FieldHarness onChange={onChange} />)
    fireEvent.click(combobox())
    const listbox = screen.getByRole('listbox', { name: 'Account Type' })
    expect(listbox).toHaveClass('left-0', 'right-0')
    expect(listbox).not.toHaveClass('min-w-full')
    for (const option of screen.getAllByRole('option')) expect(option).toHaveAttribute('aria-selected', 'false')
    expect(listbox).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0]!.id)
    fireEvent.click(screen.getByRole('option', { name: 'Savings' }))
    expect(onChange).toHaveBeenCalledWith('savings')
    expect(within(combobox()).getByText('Savings')).toHaveClass('text-ink-2')
    expect(combobox()).toHaveClass('border-ink-2')
    expect(combobox()).toHaveFocus()
  })

  it('does not toggle the list when the label is clicked', () => {
    render(<FieldHarness />)
    fireEvent.click(screen.getByText('Account Type'))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('attaches the trigger to a new ref passed on a later render', () => {
    const first = vi.fn()
    const second = vi.fn()
    const props = { variant: 'field', label: 'Account Type', placeholder: 'Select type…', options: typeOptions, value: '', onChange: () => {} } as const
    const { rerender } = render(<Dropdown {...props} ref={first} />)
    expect(first).toHaveBeenLastCalledWith(combobox())
    rerender(<Dropdown {...props} ref={second} />)
    expect(second).toHaveBeenLastCalledWith(combobox())
  })

  it('passes required to the combobox as aria-required', () => {
    render(<Dropdown variant="field" label="Account Type" placeholder="Select type…" options={typeOptions} value="" onChange={() => {}} required />)
    expect(combobox()).toHaveAttribute('aria-required', 'true')
  })

  it('links its error with aria-invalid and aria-describedby', () => {
    render(<FieldHarness error="Choose an account type." />)
    expect(combobox()).toHaveAttribute('aria-invalid', 'true')
    expect(combobox()).toHaveAccessibleDescription('Choose an account type.')
    expect(combobox()).toHaveClass('border-danger')
  })

  it('shows the placeholder for an unknown value instead of falling back to option 0', () => {
    render(<FieldHarness initial={'loan' as Kind} />)
    expect(within(combobox()).getByText('Select type…')).toBeInTheDocument()
  })

  it('hands the trigger to ref and calls onBlur only when focus leaves the control', () => {
    const onBlur = vi.fn()
    let node: HTMLButtonElement | null = null
    render(<FieldHarness onBlur={onBlur} buttonRef={(n) => (node = n)} />)
    expect(node).toBe(combobox())
    combobox().focus()
    fireEvent.click(combobox())
    // Focus moved from the trigger to the list: still inside.
    expect(onBlur).not.toHaveBeenCalled()
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' })
    expect(onBlur).not.toHaveBeenCalled()
    screen.getByRole('button', { name: 'Outside' }).focus()
    expect(onBlur).toHaveBeenCalledTimes(1)
  })

  it('marks Escape in the open list as handled, so an enclosing modal stays open', () => {
    render(<FieldHarness initial="checking" />)
    fireEvent.click(combobox())
    const handled = !fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' })
    expect(handled).toBe(true)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(within(combobox()).getByText('Checking')).toBeInTheDocument()
  })
})
