/** "or sign in with" / "or sign up with" rule between the primary and Google buttons. */
export function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-5 px-7">
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <span className="text-14 text-subtle">{label}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  )
}
