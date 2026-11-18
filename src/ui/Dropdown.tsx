import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { icons } from './icons.ts'

export type DropdownOption<Value extends string = string> = { value: Value; label: string }

/**
 * `'plain'`: the bold label plus chevron of 109's "Monthly Comparison". `'filled'`: the grey
 * 32px-high box of 110's "01 May ~ 31 May" period selector.
 */
export type DropdownVariant = 'plain' | 'filled'

export type DropdownProps<Value extends string = string> = {
  /** Accessible name of the control (visually hidden), e.g. "Comparison period". */
  label: string
  options: readonly DropdownOption<Value>[]
  /** The selected option's value. */
  value: Value
  onChange: (value: Value) => void
  variant: DropdownVariant
}

const triggerClass: Record<DropdownVariant, string> = {
  plain: 'inline-flex items-center gap-3 rounded-button text-16 font-bold text-ink',
  filled: 'inline-flex h-8 items-center gap-2 rounded-button border border-border bg-surface px-4 text-14 text-ink-2',
}

const chevronSize: Record<DropdownVariant, number> = { plain: 24, filled: 16 }

/**
 * A controlled single-select dropdown: a trigger showing the selected option and a chevron, and a
 * listbox popup. Enter, Space and ArrowDown/ArrowUp on the trigger open it; in the list the arrow
 * keys, Home and End move, Enter or Space selects, Escape closes, and each returns focus to the
 * trigger. Tab or a click outside closes it.
 */
export function Dropdown<Value extends string>({ label, options, value, onChange, variant }: DropdownProps<Value>) {
  const baseId = useId()
  const labelId = `${baseId}-label`
  const triggerId = `${baseId}-trigger`
  const listId = `${baseId}-list`
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )
  const selected = options[selectedIndex]

  useEffect(() => {
    if (!open) return
    listRef.current?.focus()
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function openList() {
    setActiveIndex(selectedIndex)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function choose(index: number) {
    const option = options[index]
    if (option && option.value !== value) onChange(option.value)
    close()
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openList()
    }
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const last = options.length - 1
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((i) => Math.min(last, i + 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((i) => Math.max(0, i - 1))
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(last)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(activeIndex)
        break
      case 'Escape':
        event.preventDefault()
        close()
        break
      case 'Tab':
        // Refocus the trigger before the list unmounts, so the default Tab move continues from it.
        close()
        break
    }
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <span id={labelId} className="sr-only">
        {label}
      </span>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelId} ${triggerId}`}
        className={triggerClass[variant]}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onTriggerKeyDown}
      >
        <span>{selected?.label}</span>
        <icons.chevronDown aria-hidden="true" size={chevronSize[variant]} strokeWidth={2} />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={`${baseId}-option-${activeIndex}`}
          className="absolute top-full left-0 z-10 mt-2 min-w-full rounded-input bg-card py-2 shadow-card"
          onKeyDown={onListKeyDown}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${baseId}-option-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={`cursor-pointer px-4 py-2 text-16 whitespace-nowrap ${
                index === activeIndex ? 'bg-surface text-ink' : 'text-ink-2'
              } ${option.value === value ? 'font-bold' : 'font-normal'}`}
              onPointerEnter={() => setActiveIndex(index)}
              onClick={() => choose(index)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
