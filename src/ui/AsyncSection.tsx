import type { ReactNode } from 'react'
import { Button } from './Button.tsx'
import { EmptyState } from './EmptyState.tsx'
import { Skeleton } from './Skeleton.tsx'

/**
 * The slice of a query result `AsyncSection` reads. Structural, so `ui` never imports TanStack or
 * the api hooks: a `useQuery` result satisfies it as is.
 */
export type AsyncQuery<T> = {
  status: 'pending' | 'error' | 'success'
  data: T | undefined
  error: { message: string } | null
  isFetching: boolean
  refetch: () => unknown
}

export type AsyncSectionProps<T> = {
  query: AsyncQuery<T>
  /** When it returns true for loaded data, `emptyMessage` shows instead of `children`. */
  isEmpty?: (data: T) => boolean
  emptyMessage: string
  children: (data: T) => ReactNode
}

const fallbackError = 'Something went wrong. Please try again.'

/**
 * Renders a query-backed section (AD-17): a skeleton while loading, a danger message with Retry
 * when the first load fails, an empty line when empty, otherwise `children(data)`. Once data is
 * loaded, a failed background refetch keeps showing it.
 */
export function AsyncSection<T>({ query, isEmpty, emptyMessage, children }: AsyncSectionProps<T>) {
  const { data, status, error, isFetching, refetch } = query

  if (data === undefined) {
    if (status === 'error') {
      const message = error?.message.trim() || fallbackError
      return (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-16 text-danger">
            {message}
          </p>
          <Button variant="outline" size="sm" disabled={isFetching} onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )
    }
    return (
      <div aria-busy="true">
        <span className="sr-only">Loading…</span>
        <Skeleton />
      </div>
    )
  }

  if (isEmpty?.(data)) return <EmptyState message={emptyMessage} />
  return <>{children(data)}</>
}
