import type { ReactNode } from 'react'

export type TableAlign = 'left' | 'center' | 'right'

export type TableColumn<T> = {
  key: string
  header: string
  align?: TableAlign
  render: (row: T) => ReactNode
}

export type TableProps<T> = {
  columns: readonly TableColumn<T>[]
  rows: readonly T[]
  rowKey: (row: T) => string
  /** Names the table for assistive tech; visually hidden. */
  caption: string
}

const alignClass: Record<TableAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

/**
 * A semantic data table (measured from 107. Transactions.png): a bold header row and 72px body
 * rows, each separated by a divider.
 */
export function Table<T>({ columns, rows, rowKey, caption }: TableProps<T>) {
  return (
    <table className="w-full border-collapse">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-border">
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={`px-2 pb-4 text-16 font-bold text-ink ${alignClass[column.align ?? 'left']}`}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((row) => (
          <tr key={rowKey(row)}>
            {columns.map((column) => (
              <td key={column.key} className={`px-2 py-6 text-16 ${alignClass[column.align ?? 'left']}`}>
                {column.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
