export type EmptyStateProps = { message: string }

/** The default empty state: a single muted line. */
export function EmptyState({ message }: EmptyStateProps) {
  return <p className="text-16 text-muted">{message}</p>
}
