import { useQuery } from '@tanstack/react-query'
import { qk } from '../queryKeys.ts'
import { useApi } from './useApi.ts'

/** The six category spending limits, in fixed category order (Goals' "Expenses Goals by Category"). */
export function useCategoryLimits() {
  const api = useApi()
  return useQuery({
    queryKey: qk.categoryLimits(),
    queryFn: () => api.listCategoryLimits(),
  })
}
