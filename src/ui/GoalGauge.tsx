import { formatCompact } from '../lib/format.ts'
import { gaugeRatio } from './gaugeRatio.ts'

export type GoalGaugeProps = {
  /** The achieved ("Present") amount in cents. May exceed the target. */
  achievedCents: number
  /** The target in cents. 0 renders an empty gauge. */
  targetCents: number
  /** The text alternative, rendered for screen readers only. */
  summary: string
}

// Measured from 110. Goals.png at 1x: a 126px-wide half ring with a 14px stroke, a 40px needle
// and a 10px pivot dot. The end labels sit centred under the ring's ends.
const WIDTH = 140
const HEIGHT = 74
const CX = WIDTH / 2
const CY = 66
const RADIUS = 56
const STROKE = 14
const NEEDLE = 40
const PIVOT_RADIUS = 5

const round = (n: number) => Math.round(n * 1000) / 1000

/** The point at `angle` (radians, 0 = right, π = left) on a circle of `r` around the pivot. */
function pointAt(angle: number, r: number): { x: number; y: number } {
  return { x: round(CX + r * Math.cos(angle)), y: round(CY - r * Math.sin(angle)) }
}

/** An upper arc from the left end to `angle`, clockwise; never more than 180°. */
function arcTo(angle: number): string {
  const start = pointAt(Math.PI, RADIUS)
  const end = pointAt(angle, RADIUS)
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x} ${end.y}`
}

/**
 * The savings half-donut (110. Goals.png): a grey track, a teal fill over achieved ÷ target
 * (capped at 100%), a needle at the same angle, "$0" and the compact target at the ends, the
 * compact achieved amount in the centre and the "Target vs Achievement" caption. The drawing is
 * hidden from assistive technology; `summary` is the text alternative.
 */
export function GoalGauge({ achievedCents, targetCents, summary }: GoalGaugeProps) {
  const ratio = gaugeRatio(achievedCents, targetCents)
  const angle = Math.PI * (1 - ratio)
  const needle = pointAt(angle, NEEDLE)
  const leftEnd = CX - RADIUS
  const rightEnd = CX + RADIUS

  return (
    <div className="flex flex-col items-center" data-testid="goal-gauge" data-ratio={ratio}>
      <p className="sr-only">{summary}</p>
      <div aria-hidden="true" className="flex flex-col items-center">
        <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} fill="none">
          <path data-testid="gauge-track" d={arcTo(0)} className="stroke-chart-previous" strokeWidth={STROKE} strokeLinecap="round" />
          {ratio > 0 && (
            <path data-testid="gauge-fill" d={arcTo(angle)} className="stroke-chart-current" strokeWidth={STROKE} strokeLinecap="round" />
          )}
          <line
            data-testid="gauge-needle"
            x1={CX}
            y1={CY}
            x2={needle.x}
            y2={needle.y}
            className="stroke-chart-current"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <circle cx={CX} cy={CY} r={PIVOT_RADIUS} className="fill-chart-current" />
        </svg>
        <div className="relative h-6" style={{ width: WIDTH }}>
          <span
            className="absolute top-1 -translate-x-1/2 text-12 text-subtle"
            style={{ left: leftEnd }}
          >
            $0
          </span>
          <span className="absolute top-0 left-1/2 -translate-x-1/2 text-16 font-semibold text-ink">
            {formatCompact(achievedCents, 'gauge')}
          </span>
          <span
            className="absolute top-1 -translate-x-1/2 text-12 text-subtle"
            style={{ left: rightEnd }}
          >
            {formatCompact(targetCents, 'axis')}
          </span>
        </div>
      </div>
      <p className="mt-4 text-14 text-ink">Target vs Achievement</p>
    </div>
  )
}
