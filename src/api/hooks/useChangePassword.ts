import { useMutation } from '@tanstack/react-query'
import type { PasswordInput } from '../types.ts'
import { useApi } from './useApi.ts'

/**
 * Changes the password. It changes no cached data (the session and the profile stay as they are),
 * so it has no `invalidationMap` entry.
 */
export function useChangePassword() {
  const api = useApi()
  return useMutation({
    // Drop the settled mutation (and the passwords it carried) as soon as nothing observes it.
    gcTime: 0,
    mutationFn: (input: PasswordInput) => api.changePassword(input),
  })
}
