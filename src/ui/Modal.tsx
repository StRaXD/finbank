import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { icons } from './icons.ts'
import { useOverlayHost } from './overlayHost.ts'

export type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  /** The dialog's accessible name when it has no visible `title` (rendered as `aria-label`). */
  label?: string
  /**
   * `default`: the panel's top edge 276px from the viewport top (110.2. Goals.png). `tall`: 120px from
   * the top of the overlay (the content area), so a six-field form (the Account modal, about 840px)
   * fits whole at 1440×1024 without scrolling the overlay.
   */
  placement?: ModalPlacement
  children: ReactNode
}

export type ModalPlacement = 'default' | 'tall'

const placementClass: Record<ModalPlacement, string> = { default: 'pt-69', tall: 'pt-30' }

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusablesIn(el: HTMLElement): HTMLElement[] {
  return [...el.querySelectorAll<HTMLElement>(focusableSelector)]
}

/**
 * The shared dialog (UX-DR13, AD-13, measured from 110.2. Goals.png). Portals into the shell's
 * `#content-overlay-root`, so the dim covers only the content column, and holds the shell chrome
 * `inert` while open. Outside a shell it falls back to `document.body` with a viewport-wide dim.
 * Focus moves into the panel on open, Tab cycles inside it, and returns to the opener on close.
 */
export function Modal({ open, ...rest }: ModalProps) {
  if (!open) return null
  return <OpenModal {...rest} />
}

function OpenModal({ onClose, title, label, placement = 'default', children }: Omit<ModalProps, 'open'>) {
  const { container, acquireInert } = useOverlayHost()
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  // A dim click closes only when the press also started on the dim (not, say, a text-selection
  // drag that began in the panel and was released outside it).
  const pressedOnLayer = useRef(false)
  const CloseIcon = icons.close

  // Always call the latest onClose from the long-lived key listener.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => acquireInert(), [acquireInert])

  // Focus in on open; back to the opener on close or unmount.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const panel = panelRef.current
    if (panel) (focusablesIn(panel)[0] ?? panel).focus()
    return () => {
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const panel = panelRef.current
      if (!panel) return
      if (event.key === 'Escape') {
        // Leave Esc to an IME composition or to a child that already handled it.
        if (event.isComposing || event.defaultPrevented) return
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusablesIn(panel)
      const active = document.activeElement
      if (items.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const outside = !panel.contains(active)
      if (event.shiftKey && (outside || active === first || active === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (outside || active === last)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Inside the shell the layer fills the overlay root (the viewport right of the sidebar; the
  // unscrolled top bar stacks above it); outside, the whole viewport. The panel is top-anchored
  // (by default 276px from the viewport top, 188px below the top bar; see `placement`), not
  // vertically centred, and horizontally
  // centred in a padded box. 110.2. Goals.png puts the 488px panel at x 604-1092, 12px left of the
  // column's centre, so the box is pl-6 pr-12 rather than symmetric.
  const layerPosition = container ? 'absolute inset-0' : 'fixed inset-0 z-50'
  const layer = (
    <div
      data-testid="modal-overlay"
      onMouseDown={(event) => {
        pressedOnLayer.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        const pressed = pressedOnLayer.current
        pressedOnLayer.current = false
        if (pressed && event.target === event.currentTarget) onCloseRef.current()
      }}
      className={`${layerPosition} pointer-events-auto flex items-start justify-center overflow-y-auto bg-overlay ${placementClass[placement]} pr-12 pb-8 pl-6`}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title !== undefined ? titleId : undefined}
        aria-label={title === undefined ? label : undefined}
        tabIndex={-1}
        className="relative w-122 max-w-full shrink-0 rounded-modal bg-card px-16 pt-16 pb-12 focus-visible:outline-none"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => onCloseRef.current()}
          className="absolute top-6 right-6 flex size-8 cursor-pointer items-center justify-center rounded-button text-ink-2"
        >
          <CloseIcon aria-hidden="true" data-icon="close" size={32} />
        </button>
        {title !== undefined && (
          <h2 id={titleId} className="mb-4 text-20 font-semibold text-ink">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  )

  return createPortal(layer, container ?? document.body)
}
