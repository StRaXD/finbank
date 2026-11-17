import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Tabs } from './Tabs.tsx'

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'expense', label: 'Expenses' },
] as const

type Id = (typeof tabs)[number]['id']

function Harness({ onChange }: { onChange?: (id: Id) => void }) {
  const [value, setValue] = useState<Id>('all')
  return (
    <Tabs
      tabs={tabs}
      value={value}
      label="Transaction type"
      panelId="panel"
      onChange={(id) => {
        onChange?.(id)
        setValue(id)
      }}
    />
  )
}

const tab = (name: string) => screen.getByRole('tab', { name })

describe('Tabs', () => {
  it('renders a labelled tablist with the selected tab marked and in the tab order', () => {
    render(<Harness />)
    expect(screen.getByRole('tablist', { name: 'Transaction type' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['All', 'Revenue', 'Expenses'])
    expect(tab('All')).toHaveAttribute('aria-selected', 'true')
    expect(tab('All')).toHaveAttribute('tabindex', '0')
    expect(tab('All')).toHaveClass('text-primary', 'border-primary', 'border-b-2')
    expect(tab('Revenue')).toHaveAttribute('aria-selected', 'false')
    expect(tab('Revenue')).toHaveAttribute('tabindex', '-1')
    expect(tab('Revenue')).toHaveClass('text-ink-2', 'font-semibold', 'border-transparent')
    expect(tab('Revenue')).toHaveAttribute('aria-controls', 'panel')
  })

  it('selects a tab on click', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.click(tab('Revenue'))
    expect(onChange).toHaveBeenCalledWith('revenue')
    expect(tab('Revenue')).toHaveAttribute('aria-selected', 'true')
    expect(tab('All')).toHaveAttribute('tabindex', '-1')
  })

  it('does not report a change when the selected tab is clicked', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.click(tab('All'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it.each([
    ['ArrowRight', 'All', 'Revenue'],
    ['ArrowRight', 'Expenses', 'All'],
    ['ArrowLeft', 'All', 'Expenses'],
    ['ArrowLeft', 'Revenue', 'All'],
    ['Home', 'Expenses', 'All'],
    ['End', 'All', 'Expenses'],
  ])('%s from %s focuses and selects %s', (key, from, to) => {
    render(<Harness />)
    fireEvent.click(tab(from))
    fireEvent.keyDown(tab(from), { key })
    expect(tab(to)).toHaveFocus()
    expect(tab(to)).toHaveAttribute('aria-selected', 'true')
    expect(tab(to)).toHaveAttribute('tabindex', '0')
    expect(screen.getAllByRole('tab').filter((t) => t.getAttribute('tabindex') === '0')).toHaveLength(1)
  })

  it('ignores other keys', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.keyDown(tab('All'), { key: 'ArrowDown' })
    fireEvent.keyDown(tab('All'), { key: 'a' })
    expect(onChange).not.toHaveBeenCalled()
  })
})
