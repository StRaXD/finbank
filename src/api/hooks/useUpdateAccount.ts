import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyInvalidation } from '../queryKeys.ts'
import type { AccountUpdate } from '../types.ts'
import { useApi } from './useApi.ts'

export type UpdateAccountVariables = { id: string; input: AccountUpdate }

/**
 * Edits an account. On success the accounts (every account query) and the balance summary are
 * invalidated, and the mutation stays pending until their active queries have refetched.
 */
export function useUpdateAccount() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: UpdateAccountVariables) => api.updateAccount(id, input),
    onSuccess: () => applyInvalidation(queryClient, 'updateAccount'),
  })
}
