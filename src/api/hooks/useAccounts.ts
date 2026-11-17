import { useQuery } from '@tanstack/react-query'
import { qk } from '../queryKeys.ts'
import { useApi } from './useApi.ts'

/** Every account, in seed order (Balances, the Overview carousel). */
export function useAccounts() {
  const api = useApi()
  return useQuery({ queryKey: qk.accounts(), queryFn: () => api.listAccounts() })
}
