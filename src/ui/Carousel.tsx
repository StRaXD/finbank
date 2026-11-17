import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { icons } from './icons.ts'

export type CarouselProps<T> = {
  items: readonly T[]
  getKey: (item: T) => string
  renderItem: (item: T) => ReactNode
  /** Accessible name of the carousel region. */
  label: string
}

const ChevronLeft = icons.chevronLeft
const ChevronRight = icons.chevronRight

const navButton =
  'inline-flex cursor-pointer items-center gap-1 rounded-button text-16 text-ink transition enabled:hover:text-primary disabled:cursor-not-allowed disabled:text-faint'

/**
 * A one-slide-at-a-time WAI-ARIA carousel (measured from 104. Overview.png): the slide, then
 * "< Previous", one dot per item (active teal, inactive grey) and "Next >". No autoplay or swipe.
 * Left/Right arrow keys move between slides while focus is inside. Previous is disabled on the
 * first slide and Next on the last; when `items` shrinks, the index is clamped to the last item.
 */
export function Carousel<T>({ items, getKey, renderItem, label }: CarouselProps<T>) {
  const [requested, setRequested] = useState(0)
  const prevRef = useRef<HTMLButtonElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  // Set when the focused Previous/Next is about to become disabled (which drops focus to
  // <body>); the effect hands focus to the other control once it has rendered enabled.
  const pendingFocus = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    pendingFocus.current?.focus()
    pendingFocus.current = null
  })

  const count = items.length
  const last = count - 1
  // Clamped while rendering, so a shrinking list never shows an empty slide; the stored index
  // follows (a render-time update), so a list that grows back does not jump forward again.
  const index = Math.max(0, Math.min(requested, last))
  if (count > 0 && index !== requested) setRequested(index)
  const item = items[index]
  if (item === undefined) return null

  function goTo(target: number) {
    const clamped = Math.max(0, Math.min(target, last))
    setRequested(clamped)
    const active = document.activeElement
    if (clamped === last && active === nextRef.current) pendingFocus.current = prevRef.current
    if (clamped === 0 && active === prevRef.current) pendingFocus.current = nextRef.current
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Leave modified arrows (Alt+Left is browser Back) to the browser.
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key]
    if (step === undefined) return
    event.preventDefault()
    goTo(index + step)
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex flex-col gap-3"
    >
      <div aria-live="polite">
        {/* Unkeyed on purpose: the slide's elements are reused across slides, so focus on one of
            them (the ↗ link) survives an arrow-key move instead of dropping to <body>. */}
        <div role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${count}`}>
          {renderItem(item)}
        </div>
      </div>
      {/* 104 puts the controls 4px lower without growing the card: shifted visually, not by layout. */}
      <div className="relative top-1 flex items-center justify-between gap-4">
        <button
          ref={prevRef}
          type="button"
          className={navButton}
          disabled={index === 0}
          onClick={() => goTo(index - 1)}
        >
          <ChevronLeft aria-hidden="true" data-icon="chevronLeft" size={16} />
          Previous
        </button>
        <div className="flex items-center gap-2">
          {items.map((dotItem, dot) => (
            <button
              key={getKey(dotItem)}
              type="button"
              aria-label={`Show slide ${dot + 1} of ${count}`}
              aria-current={dot === index ? 'true' : undefined}
              onClick={() => goTo(dot)}
              className={`size-2 cursor-pointer rounded-full transition ${dot === index ? 'bg-primary' : 'bg-faint/50 hover:bg-faint'}`}
            />
          ))}
        </div>
        <button
          ref={nextRef}
          type="button"
          className={navButton}
          disabled={index === last}
          onClick={() => goTo(index + 1)}
        >
          Next
          <ChevronRight aria-hidden="true" data-icon="chevronRight" size={16} />
        </button>
      </div>
    </div>
  )
}
