export type ChartLegendTone = 'current' | 'previous'

export type ChartLegendItem = { label: string; tone: ChartLegendTone }

// Full literals so Tailwind's source scan emits both swatch fills.
const swatchClass: Record<ChartLegendTone, string> = {
  current: 'bg-chart-current',
  previous: 'bg-chart-previous',
}

/** The space between items: 24px (109) or 34px (110's Saving Summary). */
export type ChartLegendSpacing = 'default' | 'wide'

const spacingClass: Record<ChartLegendSpacing, string> = { default: 'gap-6', wide: 'gap-[34px]' }

/** A chart legend (109. Expenses.png): a 16×8 colour swatch before each `text-12` series label. */
export function ChartLegend({ items, spacing = 'default' }: { items: readonly ChartLegendItem[]; spacing?: ChartLegendSpacing }) {
  return (
    <ul className={`flex items-center ${spacingClass[spacing]}`}>
      {items.map((item) => (
        <li key={item.tone} className="flex items-center gap-2 text-12 text-ink-2">
          <span aria-hidden="true" data-testid={`swatch-${item.tone}`} className={`h-2 w-4 rounded-xs ${swatchClass[item.tone]}`} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
