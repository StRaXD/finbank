import { useMutation } from '@tanstack/react-query'
import { useApi } from './useApi.ts'

/** Requests a password-reset email. It changes no cached data, so it has no `invalidationMap` entry. */
export function useRequestPasswordReset() {
  const api = useApi()
  return useMutation({ mutationFn: (email: string) => api.requestPasswordReset(email) })
}
