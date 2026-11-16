import { useQuery } from '@tanstack/react-query'
import { qk } from '../queryKeys.ts'
import { useApi } from './useApi.ts'

/** The current identity, or `null` when signed out (AD-8). */
export function useSession() {
  const api = useApi()
  return useQuery({ queryKey: qk.session(), queryFn: () => api.getSession() })
}
