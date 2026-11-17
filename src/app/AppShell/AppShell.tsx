import { useMemo, useState } from 'react'
import { Outlet } from 'react-router'
import { OverlayHostContext, useInertCount, type OverlayHost } from '../../ui/overlayHost.ts'
import { Sidebar } from './Sidebar.tsx'
import { TopBar } from './TopBar.tsx'

/**
 * The signed-in layout (104–111 PNGs at 1440×1024): a fixed 280px dark sidebar, and a content
 * column with the 88px top bar over `<main>`. `<main>` ends with `#content-overlay-root`: a
 * `fixed` layer over the whole viewport right of the sidebar, so an overlay portalled there with
 * `absolute inset-0` dims only the content column, even on a scrolled page (where the top bar has
 * scrolled away). The top bar stacks above the root (`z-50`), so while visible it stays undimmed. The root is `pointer-events-none` so it never blocks the page; overlays re-enable pointer
 * events. While any overlay holds `acquireInert()`, the sidebar and top bar are `inert`.
 */
export function AppShell() {
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const { inert, acquireInert } = useInertCount()
  const host = useMemo<OverlayHost>(() => ({ container, acquireInert }), [container, acquireInert])

  return (
    <OverlayHostContext value={host}>
      <div className="min-h-screen bg-surface">
        <Sidebar inert={inert} />
        <div className="ml-70 flex min-h-screen flex-col">
          <TopBar inert={inert} />
          <main className="relative flex-1 pt-4 pr-8 pb-8 pl-6">
            <Outlet />
            <div
              id="content-overlay-root"
              ref={setContainer}
              className="pointer-events-none fixed top-0 right-0 bottom-0 left-70 z-40"
            />
          </main>
        </div>
      </div>
    </OverlayHostContext>
  )
}
