import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyInvalidation } from '../queryKeys.ts'
import type { SavingsGoalAmounts, YearMonth } from '../types.ts'
import { useApi } from './useApi.ts'

export type UpdateSavingsGoalVariables = SavingsGoalAmounts & { month: YearMonth }

/**
 * Stores a month's savings goal. On success every savings-goal query is invalidated, and the
 * mutation stays pending until the active ones have refetched.
 */
export function useUpdateSavingsGoal() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ month, targetCents, achievedCents }: UpdateSavingsGoalVariables) =>
      api.updateSavingsGoal(month, { targetCents, achievedCents }),
    onSuccess: () => applyInvalidation(queryClient, 'updateSavingsGoal'),
  })
}
