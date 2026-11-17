import type { ReactNode } from 'react'
import { useSession } from './hooks/useSession.ts'
import { SessionContext } from './sessionContext.ts'

/**
 * The only app-wide context besides `ApiProvider` (AD-8). It exposes the `useSession` query
 * result as-is and never copies query data into state.
 */
export function SessionProvider({ children }: { children?: ReactNode }) {
  const session = useSession()
  return <SessionContext value={session}>{children}</SessionContext>
}
