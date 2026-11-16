import { QueryClient } from '@tanstack/react-query'
// Side effect (types only): registers ApiError as every query and mutation error type.
import './queryTypes.ts'

/** The app's query cache with the agreed defaults. `app/providers.tsx` creates exactly one. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
    },
  })
}
