import { Link } from 'react-router'
import { icons } from '../../../ui/icons.ts'

const ChevronRight = icons.chevronRight

/**
 * The "View All >" header link of an Overview widget (measured from 104. Overview.png: small muted
 * text with a right chevron, not the teal button). A visually hidden suffix ("View All bills") keeps
 * the two Overview links distinct in a screen reader's links list.
 */
export function ViewAllLink({ to, what }: { to: string; /** Completes the accessible name, e.g. "bills". */ what: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 text-14 text-muted hover:text-ink hover:underline">
      <span>
        View All <span className="sr-only">{what}</span>
      </span>
      <ChevronRight aria-hidden="true" size={16} className="shrink-0" />
    </Link>
  )
}
