import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applyInvalidation } from '../queryKeys.ts'
import { useApi } from './useApi.ts'

/** Signs out. On success the cache is cleared and the session is seeded as `null`. */
export function useLogout() {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => applyInvalidation(queryClient, 'logout', { session: null }),
  })
}
