import { useLocation } from 'react-router'
import { useProfile } from '../../api/hooks/useProfile.ts'
import { useToday } from '../../api/hooks/useToday.ts'
import { formatDate } from '../../lib/format.ts'
import { icons } from '../../ui/icons.ts'
import { routes } from '../routes.ts'

/** The first whitespace-separated word of a full name, or '' when there is none. */
function firstNameOf(fullName: string | undefined): string {
  return fullName?.trim().split(/\s+/)[0] ?? ''
}

/**
 * The 88px top bar: on Overview only, a bold "Hello {firstName}" (from `useProfile()`, absent
 * while it loads or when the name is empty); then a decorative ">>" and today on the left; the bell and the "Search here" pill
 * on the right. The bell and search are inert by design: they look live but do nothing.
 */
export function TopBar({ inert }: { inert: boolean }) {
  const today = useToday()
  const profile = useProfile()
  const { pathname } = useLocation()
  const firstName = pathname === routes.overview ? firstNameOf(profile.data?.fullName) : ''
  const { chevronsRight: Chevrons, bell: Bell, search: SearchIcon } = icons

  return (
    <header inert={inert} className="relative z-50 flex h-22 shrink-0 items-center border-b border-border bg-surface pr-8 pl-6">
      {firstName !== '' && (
        <p data-testid="greeting" className="mr-7 text-24 font-bold text-ink">
          Hello {firstName}
        </p>
      )}
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
