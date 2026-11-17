import { NavLink } from 'react-router'
import { useLogout } from '../../api/hooks/useLogout.ts'
import wordmarkWhite from '../../assets/brands/wordmark-white.svg'
import { icons } from '../../ui/icons.ts'
import { navItems } from './navItems.ts'
import { UserBlock } from './UserBlock.tsx'

// Measured from 105. Balances.png: 224×48 items, 4px radius, icon at +16px, label at +52px.
const itemBase = 'flex h-12 items-center gap-3 rounded-button px-4 text-16'

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${itemBase} bg-primary font-bold text-on-dark` : `${itemBase} text-on-dark-muted hover:bg-on-dark-hover`

/**
 * Fixed dark sidebar: wordmark, the seven sections, Logout, a divider and the user block.
 * Logout only calls `useLogout`: on success the session is seeded `null` and `RequireSession`
 * sends the user to Login; on failure the user stays here and the button re-enables.
 */
export function Sidebar({ inert }: { inert: boolean }) {
  const logout = useLogout()
  const LogoutIcon = icons.logout

  return (
    <aside inert={inert} className="fixed inset-y-0 left-0 flex w-70 flex-col overflow-y-auto bg-sidebar px-7 pt-13.5 pb-20">
      <img src={wordmarkWhite} alt="FINEbank.IO" width={163} height={18} className="h-4.5 w-auto shrink-0 self-center" />
      {/* NavLink matches on whole path segments: /balances/:id activates Balances, / only Overview. */}
      <nav aria-label="Main" className="mt-12">
        <ul className="flex flex-col gap-4">
          {navItems.map((item) => {
            const Icon = icons[item.icon]
            return (
              <li key={item.to}>
                <NavLink to={item.to} className={navItemClass}>
                  <Icon aria-hidden="true" data-icon={item.icon} size={24} className="shrink-0" />
                  {item.label}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className={`${itemBase} mt-auto w-full shrink-0 cursor-pointer bg-on-dark-hover text-on-dark-muted disabled:cursor-not-allowed`}
      >
        <LogoutIcon aria-hidden="true" data-icon="logout" size={24} className="shrink-0" />
        Logout
      </button>
      <hr className="mt-11 border-0 border-t border-on-dark-divider" />
      <UserBlock />
    </aside>
  )
}
