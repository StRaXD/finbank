import { fireEvent, screen } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { Button } from '../ui/Button.tsx'
import { Modal } from '../ui/Modal.tsx'
import { AppShell } from './AppShell/AppShell.tsx'
import { RequireSession } from './RequireSession.tsx'
import { routes } from './routes.ts'
import { createTestApi, renderAt } from './test-utils.tsx'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

function ModalProbe() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open modal</Button>
      <Modal open={open} title="Target Amounts" onClose={() => setOpen(false)}>
        <Button>Save</Button>
      </Modal>
    </>
  )
}

const probeRoutes = [
  {
    element: <RequireSession />,
    children: [{ element: <AppShell />, children: [{ path: routes.overview, element: <ModalProbe /> }] }],
  },
]

describe('Modal inside the app shell', () => {
  it('portals into #content-overlay-root, makes the chrome inert, and restores it on Esc', async () => {
    const api = createTestApi()
    await api.login({ email: 'tanzir@example.com', password: 'secret', persistent: true })
    renderAt(routes.overview, api, probeRoutes)

    const opener = await screen.findByRole('button', { name: 'Open modal' })
    const sidebar = screen.getByRole('navigation', { name: 'Main' }).closest('aside') as HTMLElement
    const header = screen.getByRole('banner')
    const root = document.getElementById('content-overlay-root') as HTMLElement
    expect(root).toHaveClass('fixed', 'pointer-events-none', 'top-0', 'left-70', 'right-0', 'bottom-0')
    expect(root).toBeEmptyDOMElement()
    // The top bar stacks above the full-height root, so it stays undimmed while on screen.
    expect(header).toHaveClass('relative', 'z-50', 'bg-surface')

    opener.focus()
    fireEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Target Amounts' })
    expect(root.contains(dialog)).toBe(true)
    expect(screen.getByRole('main').contains(dialog)).toBe(true)
    expect(sidebar).toHaveAttribute('inert')
    expect(header).toHaveAttribute('inert')
    expect(screen.getByRole('main')).not.toHaveAttribute('inert')
    expect(dialog.contains(document.activeElement)).toBe(true)

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(root).toBeEmptyDOMElement()
    expect(sidebar).not.toHaveAttribute('inert')
    expect(header).not.toHaveAttribute('inert')
    expect(opener).toHaveFocus()
  })
})
