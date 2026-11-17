import { formatPercent } from '../lib/format.ts'
import { icons } from './icons.ts'

export type TrendIndicatorProps = {
  /** Signed integer percent, as derived by the adapter: positive is an increase. */
  changePct: number
  /** Optional line below, e.g. "Compare to last month". */
  caption?: string
  /**
   * `'card'` (default): the Expenses card header style (109), `text-16` percent and a 16px arrow.
   * `'tile'`: the Overview tile style (104), a `text-14` muted percent with a "*" marker pointing
   * at the card's "*Compare to last month" caption, and a 14px arrow on the same line.
   */
  variant?: 'card' | 'tile'
}

const ArrowUp = icons.arrowUp
const ArrowDown = icons.arrowDown

/**
 * A two-digit percent then a direction arrow (109. Expenses.png): a red ↑ for an increase (more
 * spending is bad), a green ↓ for a decrease. 0 shows "00%" in muted grey with no arrow. The direction
 * comes only from the sign of `changePct`.
 */
export function TrendIndicator({ changePct, caption, variant = 'card' }: TrendIndicatorProps) {
  const up = changePct > 0
  const down = changePct < 0
  const tone = up ? 'text-danger' : 'text-positive'
  const tile = variant === 'tile'
  const percentClass = tile
    ? 'text-14 font-normal text-muted'
    : `text-16 font-medium ${up || down ? 'text-ink-2' : 'text-muted'}`
  const arrowSize = tile ? 14 : 16
  return (
    <div className={`flex flex-col ${tile ? 'items-start' : 'items-end'}`}>
      <span data-testid="trend" className={`flex items-center ${tile ? 'gap-1.5' : 'gap-2'}`}>
        <span className={percentClass}>
          {formatPercent(changePct)}
          {/* The marker points at the card caption, which screen readers reach on its own. */}
          {tile && <span aria-hidden="true">*</span>}
        </span>
        {up && <ArrowUp aria-hidden="true" data-icon="arrowUp" size={arrowSize} className={tone} />}
        {down && <ArrowDown aria-hidden="true" data-icon="arrowDown" size={arrowSize} className={tone} />}
        {(up || down) && <span className="sr-only">{up ? 'increase' : 'decrease'}</span>}
      </span>
      {caption !== undefined && <span className="text-12 text-muted">{caption}</span>}
    </div>
  )
}
