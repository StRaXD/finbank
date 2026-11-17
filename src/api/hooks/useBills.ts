import { useQuery } from '@tanstack/react-query'
import { qk } from '../queryKeys.ts'
import type { ListBillsInput } from '../types.ts'
import { useApi } from './useApi.ts'

/** Upcoming bills, earliest due date first (the Bills page; `{ limit: 2 }` on Overview). */
export function useBills({ limit }: ListBillsInput = {}) {
  const api = useApi()
  return useQuery({
    queryKey: qk.bills(limit),
    queryFn: () => api.listBills(limit === undefined ? {} : { limit }),
  })
}
