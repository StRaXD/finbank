import { useQuery } from '@tanstack/react-query'
import { qk } from '../queryKeys.ts'
import { useApi } from './useApi.ts'

/** The derived Total Balance. Components show it as is and never recalculate it. */
export function useBalanceSummary() {
  const api = useApi()
  return useQuery({ queryKey: qk.balanceSummary(), queryFn: () => api.getBalanceSummary() })
}
