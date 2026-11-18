import { useEffect, useId, useImperativeHandle, useRef, useState, type FocusEvent, type KeyboardEvent, type Ref } from 'react'
import { fieldBorderClosed } from './fieldStyles.ts'
import { icons } from './icons.ts'

export type DropdownOption<Value extends string = string> = { value: Value; label: string }

/**
 * `'plain'`: the bold label plus chevron of 109's "Monthly Comparison". `'filled'`: the grey
 * 32px-high box of 110's "01 May ~ 31 May" period selector. `'subtle'`: the small grey label plus
 * chevron of 110's Saving Summary month ("May 2023"). `'field'`: a form field, the 56px bordered
 * box of the 110.2 modals (Components-1) under a visible label, with a placeholder and an error.
 */
export type DropdownVariant = 'plain' | 'filled' | 'subtle' | 'field'

type CommonProps<Value extends string> = {
  /**
   * Accessible name of the control, e.g. "Comparison period". Visually hidden, except on the
   * `field` variant, where it is the visible label.
   */
  label: string
  options: readonly DropdownOption<Value>[]
  onChange: (value: Value) => void
}

/** The display variants: an unknown `value` falls back to the first option. */
type DisplayDropdownProps<Value extends string> = CommonProps<Value> & {
  /** The selected option's value. */
  value: NoInfer<Value>
  variant: Exclude<DropdownVariant, 'field'>
}

/**
 * The form-field variant, for a react-hook-form `Controller` (`name`, `onBlur`, `ref`). An empty or
 * unknown `value` shows `placeholder` and selects no option.
 */
export type FieldDropdownProps<Value extends string> = CommonProps<Value> & {
  variant: 'field'
  /** The selected option's value, or `''` for none. */
  value: NoInfer<Value> | ''
  /** Shown (in `subtle`) while nothing is selected, e.g. "Select type…". */
  placeholder: string
  error?: string
  /** Marks the field required for assistive tech (`aria-required`). */
  required?: boolean
  name?: string
  /** Called when focus leaves the control (trigger and list). */
  onBlur?: () => void
  /** The trigger button, so a form can focus it. */
  ref?: Ref<HTMLButtonElement>
}

export type DropdownProps<Value extends string = string> = DisplayDropdownProps<Value> | FieldDropdownProps<Value>

const triggerClass: Record<DropdownVariant, string> = {
  plain: 'inline-flex items-center gap-3 rounded-button text-16 font-bold text-ink',
  filled: 'inline-flex h-8 items-center gap-2 rounded-button border border-border bg-surface px-4 text-14 text-ink-2',
  subtle: 'inline-flex items-center gap-2 rounded-button text-12 text-ink-2',
  field: 'flex h-14 w-full cursor-pointer items-center justify-between gap-2 rounded-input border bg-transparent px-6 text-left text-16',
}

const chevronSize: Record<DropdownVariant, number> = { plain: 24, filled: 16, subtle: 16, field: 20 }

/**
 * A controlled single-select dropdown: a trigger showing the selected option and a chevron, and a
 * listbox popup. Enter, Space and ArrowDown/ArrowUp on the trigger open it; in the list the arrow
 * keys, Home and End move, Enter or Space selects, Escape closes, and each returns focus to the
 * trigger. Tab or a click outside closes it.
 */
export function Dropdown<Value extends string>(props: DropdownProps<Value>) {
  const { label, options, value, onChange, variant } = props
  const field = props.variant === 'field' ? props : null
  const baseId = useId()
  const labelId = `${baseId}-label`
  const triggerId = `${baseId}-trigger`
  const listId = `${baseId}-list`
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const errorId = `${baseId}-error`
  const matchIndex = value === '' ? -1 : options.findIndex((option) => option.value === value)
  // The display variants fall back to the first option; the field shows its placeholder instead.
  const selectedIndex = field ? matchIndex : Math.max(0, matchIndex)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined
  const externalRef = field?.ref
  const onBlur = field?.onBlur

  // Hands the trigger to the field's `ref` (react-hook-form focuses it on a failed Save). No
  // dependency list (exhaustive-deps flags `externalRef` as unnecessary): it re-attaches on every
  // commit, so a new ref from the caller is always attached.
  useImperativeHandle(externalRef, () => triggerRef.current!)

  function onRootBlur(event: FocusEvent<HTMLDivElement>) {
    // Moving between the trigger and the open list is not a blur of the control.
    if (onBlur && !event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur()
  }

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
    setActiveIndex(Math.max(0, selectedIndex))
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

  const list = open && (
    <ul
      ref={listRef}
      id={listId}
      role="listbox"
      tabIndex={-1}
      aria-labelledby={labelId}
      aria-activedescendant={`${baseId}-option-${activeIndex}`}
      className={`absolute top-full z-10 mt-2 rounded-input bg-card py-2 shadow-card ${
        field ? 'right-0 left-0' : 'left-0 min-w-full'
      }`}
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
  )

  if (field) {
    const { error, name, placeholder, required } = field
    return (
      <div className="flex flex-col">
        {/* A plain label (not <label for>), so clicking it does not toggle the list. */}
        <span id={labelId} className="mb-2 text-16 font-medium text-ink-2">
          {label}
        </span>
        <div ref={rootRef} className="relative" onBlur={onRootBlur}>
          <button
            ref={triggerRef}
            id={triggerId}
            type="button"
            name={name}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-labelledby={labelId}
            aria-required={required || undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`${triggerClass.field} ${fieldBorderClosed(Boolean(error), selected !== undefined)}`}
            onClick={() => (open ? setOpen(false) : openList())}
            onKeyDown={onTriggerKeyDown}
          >
            <span className={`truncate ${selected ? 'text-ink-2' : 'text-subtle'}`}>{selected?.label ?? placeholder}</span>
            <icons.chevronDown aria-hidden="true" className="shrink-0 text-ink-2" size={chevronSize.field} strokeWidth={2} />
          </button>
          {list}
        </div>
        {error && (
          <p id={errorId} className="mt-2 text-14 text-danger">
            {error}
          </p>
        )}
      </div>
    )
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
      {list}
    </div>
  )
}
