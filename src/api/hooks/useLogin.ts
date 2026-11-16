import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyInvalidation } from '../queryKeys.ts'
import type { LoginInput } from '../types.ts'
import { useApi } from './useApi.ts'

/** Email/password sign-in. On success the cache is cleared and the session re-read. */
export function useLogin() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    // Drop the settled mutation (and its credentials) as soon as nothing observes it.
    gcTime: 0,
    mutationFn: (input: LoginInput) => api.login(input),
    onSuccess: () => applyInvalidation(queryClient, 'login'),
  })
}
