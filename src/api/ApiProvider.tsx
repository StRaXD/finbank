import type { ReactNode } from 'react'
import { ApiContext } from './hooks/useApi.ts'
import type { FinbankApi } from './port.ts'

export type ApiProviderProps = { api: FinbankApi; children?: ReactNode }

/** Makes the composed adapter available to every hook in `api/hooks` (AD-2). */
export function ApiProvider({ api, children }: ApiProviderProps) {
  return <ApiContext value={api}>{children}</ApiContext>
}
