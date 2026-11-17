import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiError } from '../api/types.ts'

// providers.tsx composes its adapter at module load, so each test loads a fresh module graph
// (after stubbing the env) and takes the hooks from that same graph.
async function loadApp() {
  const [{ AppProviders }, { useApi }, { useToday }, { useSessionContext }] = await Promise.all([
    import('./providers.tsx'),
    import('../api/hooks/useApi.ts'),
    import('../api/hooks/useToday.ts'),
    import('../api/sessionContext.ts'),
  ])
  return { AppProviders, useApi, useToday, useSessionContext }
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.resetModules()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('AppProviders', () => {
  it('composes one mock adapter and serves today after the delay', async () => {
    const { AppProviders, useApi, useToday, useSessionContext } = await loadApp()
    const adapters = new Set<unknown>()
    function Probe() {
      adapters.add(useApi())
      const session = useSessionContext()
      const today = useToday()
      return (
        <p>
          {today.data ?? 'loading'} / {session.isSuccess ? String(session.data) : 'pending'}
        </p>
      )
    }
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    )
    expect(screen.getByText(/loading/)).toBeInTheDocument()
    expect(await screen.findByText('2023-05-19 / null')).toBeInTheDocument()
    expect(adapters.size).toBe(1)
  })

  it('throws at load for an invalid VITE_API_MODE', async () => {
    vi.stubEnv('VITE_API_MODE', 'nope')
    await expect(import('./providers.tsx')).rejects.toThrow(/VITE_API_MODE/)
  })

  it('selects the http adapter for VITE_API_MODE=http', async () => {
    vi.stubEnv('VITE_API_MODE', 'http')
    const { AppProviders, useToday } = await loadApp()
    function Probe() {
      const today = useToday()
      return <p>{today.isError ? (today.error as ApiError).code : 'waiting'}</p>
    }
    vi.useFakeTimers()
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    )
    // retry: 1 means one retry after the default 1 s backoff before the error surfaces.
    await act(() => vi.advanceTimersByTimeAsync(1_500))
    await act(() => vi.advanceTimersByTimeAsync(1_500))
    expect(screen.getByText('NOT_IMPLEMENTED')).toBeInTheDocument()
  })
})
