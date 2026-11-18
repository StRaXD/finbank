import { useQuery } from '@tanstack/react-query'
import { qk } from '../queryKeys.ts'
import type { YearMonth } from '../types.ts'
import { useApi } from './useApi.ts'

/**
 * The savings goal of `month`: Goals' Savings Goal card (110) and, for the current month,
 * Overview's Goals widget (104). One key per month, so a save refreshes both.
 */
export function useSavingsGoal(month: YearMonth) {
  const api = useApi()
  return useQuery({
    queryKey: qk.savingsGoal(month),
    queryFn: () => api.getSavingsGoal(month),
  })
}
