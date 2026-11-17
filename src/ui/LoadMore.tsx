import { Button } from './Button.tsx'

export type LoadMoreProps = {
  /** Whether another page exists. Nothing renders when false. */
  hasMore: boolean
  /** True while the next page loads: the button is aria-disabled and ignores clicks, keeping focus. */
  loading: boolean
  onClick: () => void
  /** The last load's failure, shown as a danger line; the button retries. */
  error?: string
}

/** The centred primary "Load More" button under a paged list (107. Transactions.png). */
export function LoadMore({ hasMore, loading, onClick, error }: LoadMoreProps) {
  if (!hasMore) return null
  return (
    <div className="flex flex-col items-center gap-3 pt-8 pb-8">
      {error && (
        <p role="alert" className="text-16 text-danger">
          {error}
        </p>
      )}
      <div className="w-48">
        {/* aria-disabled, not disabled: a disabled button would drop keyboard focus to <body>. */}
        <Button
          fullWidth
          aria-disabled={loading || undefined}
          aria-busy={loading || undefined}
          onClick={() => {
            if (!loading) onClick()
          }}
        >
          Load More
        </Button>
      </div>
    </div>
  )
}
