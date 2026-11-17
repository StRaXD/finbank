import { Link } from 'react-router'
import { useProfile } from '../../api/hooks/useProfile.ts'
import avatarPlaceholder from '../../assets/avatar-placeholder.svg'
import { icons } from '../../ui/icons.ts'
import { routes } from '../routes.ts'

/**
 * Avatar, name, "View profile" and the inert kebab. Name and avatar come from `useProfile()`,
 * never the session; while it loads or after it fails, the name line stays empty at its height.
 */
export function UserBlock() {
  const profile = useProfile()
  const Kebab = icons.kebab

  return (
    <div className="mt-7.75 flex h-10 shrink-0 items-center gap-4">
      <img
        src={profile.data?.avatarUrl || avatarPlaceholder}
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-full object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col items-start">
        <p data-testid="user-name" className="h-6 max-w-full truncate text-16 font-semibold text-on-dark">
          {profile.data?.fullName}
        </p>
        <Link to={routes.viewProfile} className="rounded-button text-12 text-on-dark-muted hover:text-on-dark">
          View profile
        </Link>
      </div>
      {/* Inert by design: the menu has no actions yet. -mr-2.5 puts the dots at the 252px edge. */}
      <button
        type="button"
        aria-disabled="true"
        aria-label="More options"
        className="-mr-2.5 flex size-6 shrink-0 cursor-default items-center justify-center rounded-button text-on-dark"
      >
        <Kebab aria-hidden="true" data-icon="kebab" size={24} />
      </button>
    </div>
  )
}
