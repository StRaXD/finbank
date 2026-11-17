import { useQuery } from '@tanstack/react-query'
import { qk } from '../queryKeys.ts'
import { useApi } from './useApi.ts'

/** The six expense category summaries for the month containing today (Expenses Breakdown). */
export function useCategorySummaries() {
  const api = useApi()
  return useQuery({
    queryKey: qk.categorySummaries(),
    queryFn: () => api.listCategorySummaries(),
  })
}
