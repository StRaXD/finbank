import { useQuery } from '@tanstack/react-query'
import { qk } from '../queryKeys.ts'
import type { ComparisonGranularity } from '../types.ts'
import { useApi } from './useApi.ts'

/** The expense comparison series for `granularity` (Expenses Comparison, Overview Statistics). */
export function useComparison(granularity: ComparisonGranularity) {
  const api = useApi()
  return useQuery({
    queryKey: qk.comparison(granularity),
    queryFn: () => api.getComparison(granularity),
  })
}
