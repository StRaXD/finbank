import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Dropdown } from './Dropdown.tsx'

const options = [
  { value: 'year', label: 'Monthly Comparison' },
  { value: 'week', label: 'Weekly Comparison' },
] as const

type Period = (typeof options)[number]['value']

function Harness({ onChange }: { onChange?: (value: Period) => void }) {
  const [value, setValue] = useState<Period>('year')
  return (
    <>
      <Dropdown
        label="Comparison period"
        options={options}
        value={value}
        variant="plain"
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
