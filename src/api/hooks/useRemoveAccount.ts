import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyInvalidation } from '../queryKeys.ts'
import { useApi } from './useApi.ts'

/**
 * Removes an account. On success the accounts list and the balance summary are invalidated, and
 * the mutation stays pending until their active queries have refetched.
 */
export function useRemoveAccount() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.removeAccount(id),
    onSuccess: () => applyInvalidation(queryClient, 'removeAccount'),
  })
}
