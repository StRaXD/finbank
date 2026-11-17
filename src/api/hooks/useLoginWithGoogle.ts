import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyInvalidation } from '../queryKeys.ts'
import type { GoogleLoginInput } from '../types.ts'
import { useApi } from './useApi.ts'

/** Mock Google sign-in; `persistent` follows "Keep me signed in". On success the cache is cleared and the session seeded with the result. */
export function useLoginWithGoogle() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    // Drop the settled mutation (and its credentials) as soon as nothing observes it.
    gcTime: 0,
    mutationFn: (input: GoogleLoginInput) => api.loginWithGoogle(input),
    onSuccess: (session) => applyInvalidation(queryClient, 'loginWithGoogle', { session }),
  })
}
