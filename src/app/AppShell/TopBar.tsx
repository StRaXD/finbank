import { useToday } from '../../api/hooks/useToday.ts'
import { formatDate } from '../../lib/format.ts'
import { icons } from '../../ui/icons.ts'

/**
 * The 88px top bar: a decorative ">>" and today on the left; the bell and the "Search here" pill
 * on the right. The bell and search are inert by design: they look live but do nothing.
 */
export function TopBar({ inert }: { inert: boolean }) {
  const today = useToday()
  const { chevronsRight: Chevrons, bell: Bell, search: SearchIcon } = icons

  return (
    <header inert={inert} className="flex h-22 shrink-0 items-center border-b border-border pr-8 pl-6">
      <div className="flex items-center gap-1 text-14 text-faint">
        <Chevrons aria-hidden="true" data-icon="chevronsRight" size={24} />
        {/* RequireSession renders the shell only once today has loaded. */}
        {today.data !== undefined && <span>{formatDate(today.data, 'header')}</span>}
      </div>
      <div className="ml-auto flex items-center gap-10">
        <button
          type="button"
          aria-disabled="true"
          aria-label="Notifications"
          className="relative flex size-6 cursor-default items-center justify-center rounded-button text-muted"
        >
          <Bell aria-hidden="true" data-icon="bell" size={24} fill="currentColor" />
          <span
            aria-hidden="true"
            data-testid="unread-dot"
            className="absolute top-0.5 right-0.5 size-1.75 rounded-full bg-primary"
          />
        </button>
        <form
          role="search"
          onSubmit={(event) => event.preventDefault()}
          className="flex h-12 w-88 items-center gap-4 rounded-input bg-card pr-6 pl-8 shadow-card focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring"
        >
          <label htmlFor="shell-search" className="sr-only">
            Search
          </label>
          <input
            id="shell-search"
            type="text"
            placeholder="Search here"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-16 text-ink placeholder:text-faint focus-visible:outline-none"
          />
          <SearchIcon aria-hidden="true" data-icon="search" size={24} className="shrink-0 text-ink-2" />
        </form>
      </div>
    </header>
  )
}
