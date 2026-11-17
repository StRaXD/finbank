import { useId, type ReactNode } from 'react'

export type CardProps = {
  /** Section title, shown as a large grey `h2` above the card. */
  title?: string
  /** Header actions (e.g. "View All >"), right-aligned on the title row. */
  actions?: ReactNode
  /**
   * Stretches the card to its container's height (equal-height cards in a grid row, 104). The box
   * becomes a flex column, so a child can centre itself with `my-auto`.
   */
  fill?: boolean
  children: ReactNode
}

/**
 * The shared card shell (UX-DR10, measured from 104. Overview.png): an optional `text-22` subtle
 * title row 8px above a white, 8px-radius, soft-shadow box with 24px padding.
 */
export function Card({ title, actions, fill = false, children }: CardProps) {
  const titleId = useId()
  // `actions={cond && <Button/>}` can pass false/null: treat empty nodes as no actions.
  const hasActions = actions !== undefined && actions !== null && typeof actions !== 'boolean'
  const hasHeader = title !== undefined || hasActions
  return (
    <section aria-labelledby={title !== undefined ? titleId : undefined} className={`flex flex-col gap-2 ${fill ? 'h-full' : ''}`}>
      {hasHeader && (
        <div className="flex items-center justify-between gap-4">
          {title !== undefined && (
            <h2 id={titleId} className="text-22 font-normal text-subtle">
              {title}
            </h2>
          )}
          {hasActions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div
        data-testid="card-body"
        className={`rounded-card bg-card p-6 shadow-card ${fill ? 'flex flex-1 flex-col' : ''}`}
      >
        {children}
      </div>
    </section>
  )
}
