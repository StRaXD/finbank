import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ApiProvider } from '../api/ApiProvider.tsx'
import { SessionProvider } from '../api/SessionProvider.tsx'
import { createApi } from '../api/createApi.ts'
import { createQueryClient } from '../api/queryClient.ts'

// Exactly one adapter and one query cache for the whole app, created once at module load
// (so StrictMode double renders cannot create a second one).
const api = createApi(import.meta.env.VITE_API_MODE)
const queryClient = createQueryClient()

export function AppProviders({ children }: { children?: ReactNode }) {
  return (
    <ApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>{children}</SessionProvider>
      </QueryClientProvider>
    </ApiProvider>
  )
}
