import { createContext, useContext } from 'react'
import type { FinbankApi } from '../port.ts'

/** Holds the one adapter composed in `app/providers.tsx`. Provided by `ApiProvider`. */
export const ApiContext = createContext<FinbankApi | null>(null)

/** The composed `FinbankApi` adapter. Throws outside `ApiProvider`. */
export function useApi(): FinbankApi {
  const api = useContext(ApiContext)
  if (!api) throw new Error('useApi must be used inside <ApiProvider>.')
  return api
}
