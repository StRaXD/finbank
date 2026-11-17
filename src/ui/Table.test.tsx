import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Table, type TableColumn } from './Table.tsx'

type Row = { id: string; name: string; amount: string }

const rows: Row[] = [
  { id: 'a', name: 'Alpha', amount: '$1.00' },
  { id: 'b', name: 'Beta', amount: '$2.00' },
]

const columns: TableColumn<Row>[] = [
  { key: 'name', header: 'Name', width: '70%', render: (r) => r.name },
  { key: 'amount', header: 'Amount', align: 'right', width: '30%', render: (r) => r.amount },
]

const cells = () => within(screen.getByRole('table')).getAllByRole('cell')

describe('Table', () => {
  it('renders a captioned table with a header row and one row per item', () => {
    render(<Table columns={columns} rows={rows} rowKey={(r) => r.id} caption="Things" />)
    const table = screen.getByRole('table', { name: 'Things' })
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Name', 'Amount'])
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(cells()[1]).toHaveClass('text-right')
  })

  it('uses the 72px rows by default and the compact rows with density="sm"', () => {
    const { unmount } = render(<Table columns={columns} rows={rows} rowKey={(r) => r.id} caption="Things" />)
    for (const cell of cells()) expect(cell).toHaveClass('py-6')
    unmount()
    render(<Table columns={columns} rows={rows} rowKey={(r) => r.id} caption="Things" density="sm" />)
    for (const cell of cells()) {
      expect(cell).toHaveClass('py-3.75')
      expect(cell).not.toHaveClass('py-6')
    }
  })

  it('fixes the layout with one col per column when widths are given', () => {
    render(<Table columns={columns} rows={rows} rowKey={(r) => r.id} caption="Things" />)
    const table = screen.getByRole('table')
    expect(table).toHaveClass('table-fixed')
    expect([...table.querySelectorAll('col')].map((col) => col.style.width)).toEqual(['70%', '30%'])
  })

  it('lets the content size the columns when no width is given', () => {
    const fluid = columns.map(({ width: _width, ...column }) => column)
    render(<Table columns={fluid} rows={rows} rowKey={(r) => r.id} caption="Things" />)
    const table = screen.getByRole('table')
    expect(table).not.toHaveClass('table-fixed')
    expect(table.querySelector('colgroup')).toBeNull()
  })
})
