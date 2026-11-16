import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyInvalidation } from '../queryKeys.ts'
import type { SignupInput } from '../types.ts'
import { useApi } from './useApi.ts'

/** Sign-up (always persistent). On success the cache is cleared and the session seeded with the result. */
export function useSignup() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    // Drop the settled mutation (and its credentials) as soon as nothing observes it.
    gcTime: 0,
    mutationFn: (input: SignupInput) => api.signup(input),
    onSuccess: (session) => applyInvalidation(queryClient, 'signup', { session }),
  })
}
