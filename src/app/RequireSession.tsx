import { Navigate, Outlet } from 'react-router'
import { useSession } from '../api/hooks/useSession.ts'
import { useToday } from '../api/hooks/useToday.ts'
import { Button } from '../ui/Button.tsx'
import { PageBusy } from './PageBusy.tsx'
import { routes } from './routes.ts'

/**
 * Layout route over every app route. Signed-out users go to Login; signed-in users see the
 * app only once mock today has loaded, so no screen ever renders without "today".
 */
export function RequireSession() {
  const session = useSession()
  const today = useToday()

  if (session.isPending) return <PageBusy />
  if (!session.data) return <Navigate to={routes.login} replace />
  // A failed background refetch keeps the cached today; only a first-load failure blocks the app.
  if (today.data === undefined) {
    if (!today.isError) return <PageBusy />
    return (
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-16 text-danger">{today.error.message}</p>
        <Button onClick={() => void today.refetch()}>Retry</Button>
      </div>
    )
  }
  return <Outlet />
}
