import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog.tsx'

function renderDialog(pending = false) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <ConfirmDialog
      open
      title="Remove account?"
      message="This cannot be undone."
      onConfirm={onConfirm}
      onCancel={onCancel}
      pending={pending}
    />,
  )
  return { onConfirm, onCancel }
}

/** A full press on the dim layer itself: mousedown and click both target the layer. */
function dimClick() {
  const layer = screen.getByTestId('modal-overlay')
  fireEvent.mouseDown(layer)
  fireEvent.click(layer)
}

describe('ConfirmDialog', () => {
  it('shows the title, message and the default buttons, Cancel then Confirm', () => {
    renderDialog()
    const dialog = screen.getByRole('dialog', { name: 'Remove account?' })
    expect(within(dialog).getByText('This cannot be undone.')).toBeInTheDocument()
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' })
    const confirm = within(dialog).getByRole('button', { name: 'Confirm' })
    expect(cancel).toHaveClass('border-primary', 'text-primary')
    expect(confirm).toHaveClass('bg-primary')
    expect(cancel.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(cancel.parentElement).toHaveClass('flex', 'justify-center')
  })

  it('uses custom labels', () => {
    render(
      <ConfirmDialog
        open
        title="Remove?"
        message="Sure?"
        confirmLabel="Remove"
        cancelLabel="Keep"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    render(<ConfirmDialog open={false} title="Remove?" message="Sure?" onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('calls only onConfirm when Confirm is clicked', () => {
    const { onConfirm, onCancel } = renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it.each([
    ['Cancel', () => fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))],
    ['Esc', () => fireEvent.keyDown(document.body, { key: 'Escape' })],
    ['the X', () => fireEvent.click(screen.getByRole('button', { name: 'Close' }))],
    ['a dim click', () => dimClick()],
  ])('calls only onCancel on %s', (_, act) => {
    const { onConfirm, onCancel } = renderDialog()
    act()
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('disables both buttons and ignores closing while pending', () => {
    const { onConfirm, onCancel } = renderDialog(true)
    const confirm = screen.getByRole('button', { name: 'Confirm' })
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    expect(confirm).toBeDisabled()
    expect(cancel).toBeDisabled()
    fireEvent.click(confirm)
    fireEvent.click(cancel)
    fireEvent.keyDown(document.body, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    dimClick()
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows no alert without an error', () => {
    renderDialog()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the error as a danger line under the message, with Confirm still enabled', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open
        title="Remove account?"
        message="This cannot be undone."
        error="Your browser storage is full."
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    )
    const alert = within(screen.getByRole('dialog')).getByRole('alert')
    expect(alert).toHaveTextContent('Your browser storage is full.')
    expect(alert).toHaveClass('text-danger')
    const message = screen.getByText('This cannot be undone.')
    expect(message.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
