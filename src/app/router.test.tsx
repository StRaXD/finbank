import { act, fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { FinbankApi } from '../api/port.ts'
import { ApiError, type IsoDate } from '../api/types.ts'
import { routes } from './routes.ts'
import { createTestApi, renderAt, watchDom } from './test-utils.tsx'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

async function signedInApi(overrides: Partial<FinbankApi> = {}) {
  const api = createTestApi(overrides)
  await api.login({ email: 'tanzir@example.com', password: 'secret', persistent: true })
  return api
}

describe('routing and session guard', () => {
  it.each([[routes.overview], [routes.goals], [routes.balances], [routes.accountDetails('acc_1')], [routes.settings]])(
    'redirects %s to Login with no session',
    async (path) => {
      const { router } = renderAt(path)
      expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe(routes.login)
    },
  )

  it.each([[routes.login], [routes.signup], [routes.forgotPassword]])(
    'redirects %s to Overview when signed in',
    async (path) => {
      const { router } = renderAt(path, await signedInApi())
      expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe(routes.overview)
    },
  )

  it('renders each app route placeholder when signed in', async () => {
    const api = await signedInApi()
    const cases = [
      [routes.balances, 'Balances'],
      [routes.accountDetails('acc_1'), 'Account Details'],
      [routes.transactions, 'Transactions'],
      [routes.bills, 'Bills'],
      [routes.expenses, 'Expenses'],
      [routes.goals, 'Goals'],
      [routes.settings, 'Settings'],
    ] as const
    for (const [path, title] of cases) {
      const { unmount } = renderAt(path, api)
      expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
      unmount()
    }
  })

  it('redirects an unknown path to Overview', async () => {
    const { router } = renderAt(`${routes.overview}no-such-page`, await signedInApi())
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(routes.overview)
  })

  it('waits for today before rendering an app route', async () => {
    let resolveToday: ((today: IsoDate) => void) | undefined
    const api = await signedInApi({
      getToday: () =>
        new Promise<IsoDate>((resolve) => {
          resolveToday = resolve
        }),
    })
    renderAt(routes.goals, api)
    expect(screen.getByTestId('page-busy')).toHaveAttribute('aria-busy', 'true')
    // Let the session resolve; today is still pending, so nothing is visible yet.
    await act(async () => {
      await api.getSession()
    })
    expect(screen.getByTestId('page-busy')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Goals' })).not.toBeInTheDocument()
    expect(resolveToday).toBeDefined()
    await act(async () => resolveToday?.('2023-05-19' as IsoDate))
    expect(await screen.findByRole('heading', { level: 1, name: 'Goals' })).toBeInTheDocument()
  })

  it('shows a first-load today failure with a working Retry', async () => {
    let fail = true
    const api = await signedInApi({
      getToday: () =>
        fail
          ? Promise.reject(new ApiError('UNKNOWN', 'Could not load today.'))
          : Promise.resolve('2023-05-19' as IsoDate),
    })
    renderAt(routes.goals, api)
    // The app query client retries once (about 1 s) before the error surfaces.
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent('Could not load today.')
    expect(screen.queryByRole('heading', { name: 'Goals' })).not.toBeInTheDocument()
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Goals' })).toBeInTheDocument()
  })

  it('never shows the Login form to a signed-in user before redirecting', async () => {
    const api = await signedInApi()
    const watch = watchDom(() => screen.queryByLabelText('Email Address') !== null)
    renderAt(routes.login, api)
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
    expect(watch.stop()).toBe(false)
  })

  it('serves the dev specimen in dev without a session', async () => {
    if (!routes.specimen) throw new Error('routes.specimen must exist in dev')
    renderAt(routes.specimen)
    expect(await screen.findByRole('heading', { level: 1, name: 'Finbank design tokens' })).toBeInTheDocument()
  })
})
