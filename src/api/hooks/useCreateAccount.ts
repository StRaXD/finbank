import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyInvalidation } from '../queryKeys.ts'
import type { AccountInput } from '../types.ts'
import { useApi } from './useApi.ts'

/**
 * Adds an account. On success the accounts (every account query) and the balance summary are
 * invalidated, and the mutation stays pending until their active queries have refetched.
 */
export function useCreateAccount() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AccountInput) => api.createAccount(input),
    onSuccess: () => applyInvalidation(queryClient, 'createAccount'),
  })
}
