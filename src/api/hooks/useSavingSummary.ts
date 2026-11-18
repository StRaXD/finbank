import { useQuery } from '@tanstack/react-query'
import { qk } from '../queryKeys.ts'
import type { YearMonth } from '../types.ts'
import { useApi } from './useApi.ts'

/** The Saving Summary series of `month` (Goals' Saving Summary chart). */
export function useSavingSummary(month: YearMonth) {
  const api = useApi()
  return useQuery({
    queryKey: qk.savingSummary(month),
    queryFn: () => api.getSavingSummary(month),
  })
}
