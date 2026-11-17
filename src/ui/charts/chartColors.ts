// The chart palette (AD-11): CSS variables declared under `@theme static` in tokens.css, read at
// runtime because SVG presentation attributes cannot resolve `var()`. No colour literals here.
import { type ChartColorRole, chartColorVars } from './chartColorVars.ts'

export { type ChartColorRole, chartColorVars } from './chartColorVars.ts'

export type ChartColors = Record<ChartColorRole, string>

/** The computed value of every chart colour, read from `element` (default: the document root). */
export function readChartColors(element: Element = document.documentElement): ChartColors {
  const style = getComputedStyle(element)
  const entries = Object.entries(chartColorVars).map(([role, name]) => [role, style.getPropertyValue(name).trim()])
  return Object.fromEntries(entries) as ChartColors
}
