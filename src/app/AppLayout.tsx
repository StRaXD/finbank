import { Outlet } from 'react-router'

/** Minimal signed-in layout. Story 1.8 replaces it with `AppShell`. */
export function AppLayout() {
  return (
    <main className="min-h-screen p-8">
      <Outlet />
    </main>
  )
}
