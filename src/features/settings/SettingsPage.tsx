import { useId } from 'react'
import { useSearchParams } from 'react-router'
import { useProfile } from '../../api/hooks/useProfile.ts'
import { AsyncSection } from '../../ui/AsyncSection.tsx'
import { Card } from '../../ui/Card.tsx'
import { Tabs } from '../../ui/Tabs.tsx'
import { ProfileForm } from './components/ProfileForm.tsx'

type SettingsTab = 'account' | 'security'

const tabs = [
  { id: 'account', label: 'Account' },
  { id: 'security', label: 'Security' },
] as const satisfies readonly { id: SettingsTab; label: string }[]

/** The URL's `tab` param; a missing or unknown value is Account. */
function tabOf(param: string | null): SettingsTab {
  return param === 'security' ? 'security' : 'account'
}

function AccountPanel() {
  const profile = useProfile()
  return (
    // The form mounts only once the profile has loaded, so its defaults are the stored values.
    <AsyncSection query={profile} emptyMessage="">
      {(data) => <ProfileForm profile={data} />}
    </AsyncSection>
  )
}

/**
 * Settings (111. Settings.png): one white card with Account and Security tabs and no page heading.
 * The active tab lives only in `?tab=`; switching pushes a history entry, so Back returns to the
 * previous tab.
 */
export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = tabOf(searchParams.get('tab'))
  const panelId = useId()
  const label = tabs.find((t) => t.id === tab)?.label

  const selectTab = (id: SettingsTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', id)
      return next
    })
  }

  return (
    <Card>
      {/* Card's 24px padding plus 8px: the design's 32px inset. */}
      <div className="p-2">
        <Tabs tabs={tabs} value={tab} onChange={selectTab} label="Settings" panelId={panelId} />
        <div role="tabpanel" id={panelId} aria-label={label} className="mt-11">
          {tab === 'account' ? (
            <AccountPanel />
          ) : (
            <p className="text-16 text-subtle">Password settings are coming soon.</p>
          )}
        </div>
      </div>
    </Card>
  )
}
