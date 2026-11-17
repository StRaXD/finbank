import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal.tsx'
import { OverlayHostContext, type OverlayHost } from './overlayHost.ts'

function Harness({ onClose, title = 'Edit goal' }: { onClose?: () => void; title?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Modal
        open={open}
        title={title}
        onClose={() => {
          onClose?.()
          setOpen(false)
        }}
      >
        <label>
          Amount
          <input />
        </label>
        <button type="button">Save</button>
      </Modal>
    </>
  )
}

function openModal() {
  const opener = screen.getByRole('button', { name: 'Open' })
  opener.focus()
  fireEvent.click(opener)
  return opener
}

/** A full press on the dim layer itself: mousedown and click both target the layer. */
function dimClick() {
  const layer = screen.getByTestId('modal-overlay')
  fireEvent.mouseDown(layer)
  fireEvent.click(layer)
}

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={() => {}}>
        <p>hidden</p>
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('hidden')).not.toBeInTheDocument()
  })

  it('portals into document.body outside an overlay host, labelled by its title', () => {
    render(<Harness />)
    openModal()
    const dialog = screen.getByRole('dialog', { name: 'Edit goal' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    const overlay = screen.getByTestId('modal-overlay')
    expect(overlay.parentElement).toBe(document.body)
    expect(overlay).toHaveClass('fixed', 'inset-0', 'bg-overlay', 'pointer-events-auto')
    expect(dialog).toHaveClass('rounded-modal', 'bg-card', 'w-122')
  })

  it('portals into the host container and holds inert until closed', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const release = vi.fn()
    const host: OverlayHost = { container, acquireInert: vi.fn(() => release) }
    render(
      <OverlayHostContext value={host}>
        <Harness />
      </OverlayHostContext>,
    )
    expect(host.acquireInert).not.toHaveBeenCalled()
    openModal()
    const overlay = screen.getByTestId('modal-overlay')
    expect(overlay.parentElement).toBe(container)
    expect(overlay).toHaveClass('absolute', 'inset-0')
    expect(host.acquireInert).toHaveBeenCalledTimes(1)
    expect(release).not.toHaveBeenCalled()
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    expect(release).toHaveBeenCalledTimes(1)
    container.remove()
  })

  it('releases inert when unmounted while open', () => {
    const release = vi.fn()
    const host: OverlayHost = { container: null, acquireInert: () => release }
    const { unmount } = render(
      <OverlayHostContext value={host}>
        <Modal open onClose={() => {}}>
          <button type="button">Inside</button>
        </Modal>
      </OverlayHostContext>,
    )
    expect(release).not.toHaveBeenCalled()
    unmount()
    expect(release).toHaveBeenCalledTimes(1)
  })

  it('has no accessible name without a title', () => {
    render(
      <Modal open onClose={() => {}}>
        <button type="button">Inside</button>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-labelledby')
  })

  it('moves focus to the first focusable element (the X) on open', () => {
    render(<Harness />)
    openModal()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  })

  it('wraps Tab and Shift+Tab inside the panel', () => {
    render(<Harness />)
    openModal()
    const close = screen.getByRole('button', { name: 'Close' })
    const save = screen.getByRole('button', { name: 'Save' })
    save.focus()
    fireEvent.keyDown(save, { key: 'Tab' })
    expect(close).toHaveFocus()
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(save).toHaveFocus()
    // A middle element is left to the browser's own Tab order.
    const input = screen.getByRole('textbox', { name: 'Amount' })
    input.focus()
    expect(fireEvent.keyDown(input, { key: 'Tab' })).toBe(true)
  })

  it('pulls focus back into the panel when it has escaped', () => {
    render(<Harness />)
    const opener = openModal()
    opener.focus()
    fireEvent.keyDown(opener, { key: 'Tab' })
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  })

  it('pulls focus back into the panel on Shift+Tab when it has escaped', () => {
    render(<Harness />)
    const opener = openModal()
    opener.focus()
    fireEvent.keyDown(opener, { key: 'Tab', shiftKey: true })
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus()
  })

  it('does not close when a press starts in the panel and is released on the dim', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    openModal()
    fireEvent.mouseDown(screen.getByRole('textbox', { name: 'Amount' }))
    fireEvent.click(screen.getByTestId('modal-overlay'))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // A later full press on the dim still closes.
    dimClick()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignores Esc during IME composition', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    openModal()
    const input = screen.getByRole('textbox', { name: 'Amount' })
    input.focus()
    fireEvent.keyDown(input, { key: 'Escape', isComposing: true })
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('ignores Esc already handled by a child', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose}>
        <input
          aria-label="Combo"
          onKeyDown={(event) => {
            if (event.key === 'Escape') event.preventDefault()
          }}
        />
      </Modal>,
    )
    const input = screen.getByRole('textbox', { name: 'Combo' })
    input.focus()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it.each([
    ['Esc', () => fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })],
    ['the X', () => fireEvent.click(screen.getByRole('button', { name: 'Close' }))],
    ['a dim click', () => dimClick()],
  ])('closes once on %s and returns focus to the opener', (_, close) => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    const opener = openModal()
    expect(opener).not.toHaveFocus()
    act(() => close())
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('does not close on a click inside the panel', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    openModal()
    fireEvent.click(screen.getByRole('dialog'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('calls the latest onClose', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(
      <Modal open onClose={first}>
        <button type="button">Inside</button>
      </Modal>,
    )
    rerender(
      <Modal open onClose={second}>
        <button type="button">Inside</button>
      </Modal>,
    )
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
