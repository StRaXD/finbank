import { useQuery } from '@tanstack/react-query'
import { qk } from '../queryKeys.ts'
import { useApi } from './useApi.ts'

/** One account by id (Account Details); `data` is `null` for an unknown id. */
export function useAccount(id: string) {
  const api = useApi()
  return useQuery({ queryKey: qk.account(id), queryFn: () => api.getAccount(id) })
}
