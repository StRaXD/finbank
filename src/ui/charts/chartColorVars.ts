// The chart colour roles and their CSS variables (declared under `@theme static` in tokens.css).
// DOM-free, so the node token test can import it; `chartColors.ts` re-exports it.

/** Each chart colour role and the CSS variable that holds it. */
export const chartColorVars = {
  /** This period's bars. */
  current: '--color-chart-current',
  /** The previous period's bars. */
  previous: '--color-chart-previous',
  /** Horizontal gridlines. */
  grid: '--color-chart-grid',
} as const

export type ChartColorRole = keyof typeof chartColorVars
