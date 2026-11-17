import { useMutation } from '@tanstack/react-query'
import { useApi } from './useApi.ts'

/** Requests a password-reset email. It changes no cached data, so it has no `invalidationMap` entry. */
export function useRequestPasswordReset() {
  const api = useApi()
  return useMutation({
    // Drop the settled mutation (and the email it carried) as soon as nothing observes it.
    gcTime: 0,
    mutationFn: (email: string) => api.requestPasswordReset(email),
  })
}
