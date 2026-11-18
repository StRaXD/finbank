import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyInvalidation } from '../queryKeys.ts'
import type { CategoryLimit } from '../types.ts'
import { useApi } from './useApi.ts'

export type UpdateCategoryLimitVariables = CategoryLimit

/**
 * Stores one category's spending limit. On success the category-limits query is invalidated, and
 * the mutation stays pending until the active one has refetched.
 */
export function useUpdateCategoryLimit() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ category, limitCents }: UpdateCategoryLimitVariables) =>
      api.updateCategoryLimit(category, limitCents),
    onSuccess: () => applyInvalidation(queryClient, 'updateCategoryLimit'),
  })
}
