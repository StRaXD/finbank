// Adapters throw only `ApiError`, so TanStack Query types every query and mutation error as one.
// Forms can then read `error.fieldErrors` without casts.
import type { ApiError } from './types.ts'

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError
  }
}
