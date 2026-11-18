import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyInvalidation } from '../queryKeys.ts'
import type { ProfileInput } from '../types.ts'
import { useApi } from './useApi.ts'

/**
 * Stores the editable profile fields. On success the profile query is invalidated (so the
 * sidebar user block and the Overview greeting refresh), and the mutation stays pending until the
 * active one has refetched.
 */
export function useUpdateProfile() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProfileInput) => api.updateProfile(input),
    onSuccess: () => applyInvalidation(queryClient, 'updateProfile'),
  })
}
