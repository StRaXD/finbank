// Test helper: the real route table in a memory router, under the real providers, over a
// zero-latency mock adapter.
import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { ApiProvider } from '../api/ApiProvider.tsx'
import { createMockApi } from '../api/mock/mockApi.ts'
import type { FinbankApi } from '../api/port.ts'
import { createQueryClient } from '../api/queryClient.ts'
import { SessionProvider } from '../api/SessionProvider.tsx'
import { routeObjects } from './routeObjects.tsx'

/**
 * Stands in for the browser avatar downscaler, since jsdom cannot decode images: a fake JPEG data
 * URL that depends only on the image's size, so tests can predict it.
 */
export function stubEncodeAvatar(image: Blob): Promise<string> {
  return Promise.resolve(stubAvatarUrl(image.size))
}

/** What `stubEncodeAvatar` stores for an image of `size` bytes. */
export function stubAvatarUrl(size: number) {
  return `data:image/jpeg;base64,${btoa(`stub-avatar-${size}`)}`
}

export function createTestApi(overrides: Partial<FinbankApi> = {}): FinbankApi {
  const api = createMockApi({
    storage: localStorage,
    sessionStores: { local: localStorage, session: sessionStorage },
    delayMs: 0,
    encodeAvatar: stubEncodeAvatar,
  })
  return { ...api, ...overrides }
}

/** Renders `path` over the real route table, or over `routes` when a test needs its own table. */
export function renderAt(path: string, api: FinbankApi = createTestApi(), routes: RouteObject[] = routeObjects) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
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
  return { ...result, router, api, queryClient }
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
