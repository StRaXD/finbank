/** Stand-in for a screen whose epic has not landed yet. */
export function PlaceholderPage({ title }: { title: string }) {
  return <h1 className="text-24 font-semibold text-ink">{title}</h1>
}
