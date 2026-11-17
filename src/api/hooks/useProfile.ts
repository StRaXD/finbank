import { useQuery } from '@tanstack/react-query'
import { qk } from '../queryKeys.ts'
import { useApi } from './useApi.ts'

/** The signed-in user's profile: the shell's name and avatar come from here, not the session. */
export function useProfile() {
  const api = useApi()
  return useQuery({ queryKey: qk.profile(), queryFn: () => api.getProfile() })
}
