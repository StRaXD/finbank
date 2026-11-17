import { useMemo, useState } from 'react'
import { Outlet } from 'react-router'
import { OverlayHostContext, useInertCount, type OverlayHost } from '../../ui/overlayHost.ts'
import { Sidebar } from './Sidebar.tsx'
import { TopBar } from './TopBar.tsx'

/**
 * The signed-in layout (104–111 PNGs at 1440×1024): a fixed 280px dark sidebar, and a content
 * column with the 88px top bar over `<main>`. `<main>` is `relative` and ends with
 * `#content-overlay-root`, so an overlay portalled there with `absolute inset-0` covers only the
 * content column. While any overlay holds `acquireInert()`, the sidebar and top bar are `inert`.
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
            <div id="content-overlay-root" ref={setContainer} />
          </main>
        </div>
      </div>
    </OverlayHostContext>
  )
}
