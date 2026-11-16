// Test helper: the real route table in a memory router, under the real providers, over a
// zero-latency mock adapter.
import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { ApiProvider } from '../api/ApiProvider.tsx'
import { createMockApi } from '../api/mock/mockApi.ts'
import type { FinbankApi } from '../api/port.ts'
import { createQueryClient } from '../api/queryClient.ts'
import { SessionProvider } from '../api/SessionProvider.tsx'
import { routeObjects } from './routeObjects.tsx'

export function createTestApi(overrides: Partial<FinbankApi> = {}): FinbankApi {
  const api = createMockApi({
    storage: localStorage,
    sessionStores: { local: localStorage, session: sessionStorage },
    delayMs: 0,
  })
  return { ...api, ...overrides }
}

export function renderAt(path: string, api: FinbankApi = createTestApi()) {
  const router = createMemoryRouter(routeObjects, { initialEntries: [path] })
  const queryClient = createQueryClient()
  const result = render(
    <ApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </QueryClientProvider>
    </ApiProvider>,
  )
  return { ...result, router, api }
}

/**
 * Records whether `seen` is ever true after any DOM change from now until `stop()`. Used to
 * prove that something (a busy screen, a form) never flashes during a transition.
 */
export function watchDom(seen: () => boolean) {
  let hit = seen()
  const observer = new MutationObserver(() => {
    if (seen()) hit = true
  })
  observer.observe(document.body, { childList: true, subtree: true, attributes: true })
  return {
    stop: () => {
      observer.disconnect()
      return hit
    },
  }
}
