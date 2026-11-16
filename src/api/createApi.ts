// Adapter selection for the single composition point, `app/providers.tsx` (AD-3).
import { createHttpApi } from './http/httpApi.ts'
import { createMockApi } from './mock/mockApi.ts'
import type { FinbankApi } from './port.ts'

/** Builds the adapter named by `VITE_API_MODE`: `mock` (the default when unset or empty) or `http`. */
export function createApi(mode: string | undefined): FinbankApi {
  switch (mode || 'mock') {
    case 'mock':
      return createMockApi()
    case 'http':
      return createHttpApi()
    default:
      throw new Error(`Unknown VITE_API_MODE "${mode}". Use "mock" or "http".`)
  }
}
