import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyInvalidation } from '../queryKeys.ts'
import { useApi } from './useApi.ts'

/** Mock Google sign-in (always persistent). On success the cache is cleared and the session re-read. */
export function useLoginWithGoogle() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    // Drop the settled mutation (and its credentials) as soon as nothing observes it.
    gcTime: 0,
    mutationFn: () => api.loginWithGoogle(),
    onSuccess: () => applyInvalidation(queryClient, 'loginWithGoogle'),
  })
}
