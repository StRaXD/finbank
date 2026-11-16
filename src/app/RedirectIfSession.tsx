import { Navigate, Outlet } from 'react-router'
import { useSession } from '../api/hooks/useSession.ts'
import { PageBusy } from './PageBusy.tsx'
import { routes } from './routes.ts'

/** Layout route over the public auth routes: a signed-in user is sent to Overview. */
export function RedirectIfSession() {
  const session = useSession()
  if (session.isPending) return <PageBusy />
  if (session.data) return <Navigate to={routes.overview} replace />
  return <Outlet />
}
