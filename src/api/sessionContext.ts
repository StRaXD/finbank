import { createContext, useContext } from 'react'
import type { useSession } from './hooks/useSession.ts'

export type SessionQuery = ReturnType<typeof useSession>

/** Provided by `SessionProvider`: the app-wide `useSession` query result, and nothing else. */
export const SessionContext = createContext<SessionQuery | null>(null)

/** The app-wide session query result. Throws outside `SessionProvider`. */
export function useSessionContext(): SessionQuery {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSessionContext must be used inside <SessionProvider>.')
  return session
}
