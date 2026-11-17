import { formatPercent } from '../lib/format.ts'
import { icons } from './icons.ts'

export type TrendIndicatorProps = {
  /** Signed integer percent, as derived by the adapter: positive is an increase. */
  changePct: number
  /** Optional line below, e.g. "Compare to last month". */
  caption?: string
}

const ArrowUp = icons.arrowUp
const ArrowDown = icons.arrowDown

/**
 * A two-digit percent then a direction arrow (109. Expenses.png): a red ↑ for an increase (more
 * spending is bad), a green ↓ for a decrease. 0 shows "00%" in muted grey with no arrow. The direction
 * comes only from the sign of `changePct`.
 */
export function TrendIndicator({ changePct, caption }: TrendIndicatorProps) {
  const up = changePct > 0
  const down = changePct < 0
  const tone = up ? 'text-danger' : 'text-positive'
  return (
    <div className="flex flex-col items-end">
      <span data-testid="trend" className="flex items-center gap-2">
        <span className={`text-16 font-medium ${up || down ? 'text-ink-2' : 'text-muted'}`}>{formatPercent(changePct)}</span>
        {up && <ArrowUp aria-hidden="true" data-icon="arrowUp" size={16} className={tone} />}
        {down && <ArrowDown aria-hidden="true" data-icon="arrowDown" size={16} className={tone} />}
        {(up || down) && <span className="sr-only">{up ? 'increase' : 'decrease'}</span>}
      </span>
      {caption !== undefined && <span className="text-12 text-muted">{caption}</span>}
    </div>
  )
}
