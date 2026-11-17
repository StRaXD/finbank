import { useQuery } from '@tanstack/react-query'
import { qk } from '../queryKeys.ts'
import { useApi } from './useApi.ts'

/** Mock today (AD-9). The only source of "today" in the app. */
export function useToday() {
  const api = useApi()
  return useQuery({ queryKey: qk.today(), queryFn: () => api.getToday() })
}
