import { useId, useRef, type KeyboardEvent } from 'react'

export type TabItem<Id extends string = string> = { id: Id; label: string }

export type TabsProps<Id extends string = string> = {
  tabs: readonly TabItem<Id>[]
  /** The selected tab's id. */
  value: Id
  onChange: (id: Id) => void
  /** Accessible name of the tablist. */
  label: string
  /** The id of the panel the tabs control, for `aria-controls`. */
  panelId?: string
}

/**
 * A controlled WAI-ARIA tablist (measured from 107. Transactions.png): semibold ink-2 labels, the
 * selected one teal over a 2px teal underline. Roving tabindex; Left/Right (wrapping), Home and
 * End move focus and select at once (automatic activation); modified keys are left to the browser.
 */
export function Tabs<Id extends string>({ tabs, value, onChange, label, panelId }: TabsProps<Id>) {
  const baseId = useId()
  const refs = useRef(new Map<Id, HTMLButtonElement>())

  function select(index: number) {
    const tab = tabs[index]
    if (!tab) return
    refs.current.get(tab.id)?.focus()
    if (tab.id !== value) onChange(tab.id)
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    // Leave modified keys (Alt+Left is browser Back) to the browser.
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const last = tabs.length - 1
    const target = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key]
    if (target === undefined) return
    event.preventDefault()
    select(target)
  }

  return (
    <div role="tablist" aria-label={label} className="flex items-end gap-5">
      {tabs.map((tab, index) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            ref={(node) => {
              if (node) refs.current.set(tab.id, node)
              else refs.current.delete(tab.id)
            }}
            type="button"
            role="tab"
            id={`${baseId}-${tab.id}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => select(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`cursor-pointer border-b-2 px-2 pb-2 text-16 font-semibold transition ${
              selected ? 'border-primary text-primary' : 'border-transparent text-ink-2 hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
