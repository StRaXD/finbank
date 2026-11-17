export type SkeletonProps = {
  /** Number of placeholder bars (default 3). */
  lines?: number
}

/** Decorative loading placeholder: pulsing token-coloured bars, hidden from assistive tech. */
export function Skeleton({ lines = 3 }: SkeletonProps) {
  const count = Math.max(1, Math.floor(lines))
  return (
    <div aria-hidden="true" data-testid="skeleton" className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          data-testid="skeleton-line"
          className={`h-4 animate-pulse rounded-button bg-border ${i === count - 1 && count > 1 ? 'w-3/5' : 'w-full'}`}
        />
      ))}
    </div>
  )
}
