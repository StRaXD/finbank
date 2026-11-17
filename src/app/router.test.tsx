import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FinbankApi } from '../api/port.ts'
import { seed } from '../api/mock/seed.ts'
import { formatDate, formatMoney } from '../lib/format.ts'
import { qk } from '../api/queryKeys.ts'
import { ApiError, type IsoDate } from '../api/types.ts'
import { routeObjects } from './routeObjects.tsx'
import { RouteError } from './RouteError.tsx'
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
      [routes.transactions, 'Recent Transaction'],
      [routes.bills, 'Upcoming Bills'],
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

  it('opens Account Details from a Balances card, with Balances still active in the nav', async () => {
    const { router } = renderAt(routes.balances, await signedInApi())
    const checking = await screen.findByRole('article', { name: 'Checking' })
    fireEvent.click(within(checking).getByRole('link', { name: 'Details' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Account Details' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/balances/acc_2')
    const active = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
      .map((link) => link.textContent)
    expect(active).toEqual(['Balances'])
  })

  it('removes an account from Balances, persisted for a fresh adapter, with the chrome inert meanwhile', async () => {
    renderAt(routes.balances, await signedInApi())
    const checking = await screen.findByRole('article', { name: 'Checking' })
    fireEvent.click(within(checking).getByRole('button', { name: 'Remove' }))
    const dialog = screen.getByRole('dialog', { name: 'Remove account?' })
    expect(document.getElementById('content-overlay-root')?.contains(dialog)).toBe(true)
    expect(screen.getByRole('navigation', { name: 'Main', hidden: true }).closest('aside')).toHaveAttribute('inert')
    expect(screen.getByRole('banner', { hidden: true })).toHaveAttribute('inert')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByRole('article', { name: 'Checking' })).not.toBeInTheDocument()
    expect(screen.getAllByTestId('account-card')).toHaveLength(4)
    await expect(createTestApi().listAccounts()).resolves.toHaveLength(4)
  })

  it('removes an account from its Account Details, landing on Balances, and drops its transactions', async () => {
    const { router } = renderAt(routes.balances, await signedInApi())
    const checking = await screen.findByRole('article', { name: 'Checking' })
    fireEvent.click(within(checking).getByRole('link', { name: 'Details' }))
    const details = await screen.findByTestId('account-details')
    expect(router.state.location.pathname).toBe(routes.accountDetails('acc_2'))
    expect(within(details).getByText('Park Street Branch')).toBeInTheDocument()
    expect(within(details).getByText('693 456 699****')).toBeInTheDocument()
    expect(within(details).getByText('$25,056.00')).toBeInTheDocument()
    expect(await screen.findByRole('table', { name: 'Transactions History' })).toBeInTheDocument()

    fireEvent.click(within(details).getByRole('button', { name: 'Remove' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Remove account?' })).getByRole('button', { name: 'Remove' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Balances' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(routes.balances)
    await waitFor(() => expect(screen.getAllByTestId('account-card')).toHaveLength(4))
    expect(screen.queryByRole('article', { name: 'Checking' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await act(() => router.navigate(routes.transactions))
    await screen.findByRole('table', { name: 'Transactions' })
    for (let more = screen.queryByRole('button', { name: 'Load More' }); more; ) {
      const count = within(screen.getByRole('table')).getAllByRole('row').length
      fireEvent.click(more)
      await waitFor(() => expect(within(screen.getByRole('table')).getAllByRole('row').length).toBeGreaterThan(count))
      more = screen.queryByRole('button', { name: 'Load More' })
    }
    const rowText = within(screen.getByRole('table'))
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.textContent)
    expect(rowText.length).toBeGreaterThan(10)
    // 107 shows no receipt ids, so match whole rows: exactly the seed rows of the other accounts, in order.
    const rowOf = (t: (typeof seed.transactions)[number]) =>
      `${t.item}${t.shop}${formatDate(t.date, 'row')}${t.paymentMethod}${formatMoney(t.amountCents, 'exact')}`
    expect(seed.transactions.some((t) => t.accountId === 'acc_2')).toBe(true)
    expect(rowText).toEqual(seed.transactions.filter((t) => t.accountId !== 'acc_2').map(rowOf))
  })

  it('shows Transactions newest first, and drops a removed account’s rows', async () => {
    const { router } = renderAt(routes.transactions, await signedInApi())
    const table = await screen.findByRole('table', { name: 'Transactions' })
    const firstItems = () =>
      within(screen.getByRole('table')).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0]!.textContent)
    expect(within(table).getAllByRole('row')).toHaveLength(11)
    expect(firstItems().slice(0, 7)).toEqual(['GTR 5', 'Polo shirt', 'Biriyani', 'Movie ticket', 'Taxi fare', 'Pizza', 'Keyboard'])

    await act(() => router.navigate(routes.balances))
    const credit = await screen.findByRole('article', { name: 'Credit Card' })
    fireEvent.click(within(credit).getByRole('button', { name: 'Remove' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Remove account?' })).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await act(() => router.navigate(routes.transactions))
    await screen.findByRole('table', { name: 'Transactions' })
    await waitFor(() => expect(firstItems()).not.toContain('GTR 5'))
    const payments = within(screen.getByRole('table'))
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[3]!.textContent)
    expect(payments).toHaveLength(10)
    expect(payments).not.toContain('Credit Card')
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

  it('shows the shared fallback for a blank first-load error and offers no live Retry while refetching', async () => {
    let attempt: 'fail' | 'hang' = 'fail'
    const api = await signedInApi({
      getToday: () =>
        attempt === 'fail' ? Promise.reject(new ApiError('UNKNOWN', '   ')) : new Promise<IsoDate>(() => {}),
    })
    renderAt(routes.goals, api)
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      'Something went wrong. Please try again.',
    )
    const retry = screen.getByRole('button', { name: 'Retry' })
    expect(retry).toBeEnabled()
    attempt = 'hang'
    fireEvent.click(retry)
    // TanStack Query moves a data-less query back to `pending` while it refetches, so the busy
    // screen replaces the alert; `disabled={isFetching}` guards any state where both coincide.
    await waitFor(() => {
      const again = screen.queryByRole('button', { name: 'Retry' })
      expect(again === null || (again as HTMLButtonElement).disabled).toBe(true)
    })
    expect(screen.getByTestId('page-busy')).toBeInTheDocument()
  })

  it('keeps the app and the top-bar date when a background refetch of today fails', async () => {
    let fail = false
    const api = await signedInApi({
      getToday: () =>
        fail
          ? Promise.reject(new ApiError('UNKNOWN', 'Could not load today.'))
          : Promise.resolve('2023-05-19' as IsoDate),
    })
    const { queryClient } = renderAt(routes.goals, api)
    expect(await screen.findByRole('heading', { level: 1, name: 'Goals' })).toBeInTheDocument()
    expect(await screen.findByText('May 19, 2023')).toBeInTheDocument()

    fail = true
    await act(() => queryClient.refetchQueries({ queryKey: qk.today() }))
    // The app query client retries once (about 1 s) before the query settles as an error.
    await waitFor(() => expect(queryClient.getQueryState(qk.today())?.status).toBe('error'), { timeout: 4000 })

    expect(screen.getByRole('heading', { level: 1, name: 'Goals' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('May 19, 2023')).toBeInTheDocument()
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

describe('route error screen', () => {
  it('is the errorElement of every top-level route', () => {
    for (const route of routeObjects) {
      expect(route.errorElement).toEqual(<RouteError />)
    }
  })

  it('replaces a throwing route with the app error screen', async () => {
    // React and React Router log the caught render error; it is expected here.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    function Boom(): never {
      throw new Error('boom')
    }
    try {
      renderAt(routes.overview, createTestApi(), [
        { path: routes.overview, element: <Boom />, errorElement: <RouteError /> },
      ])
      expect(await screen.findByRole('heading', { level: 1, name: 'Something went wrong' })).toBeInTheDocument()
      expect(screen.getByText('An unexpected error occurred. Please reload the page.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Reload' })).toBeEnabled()
      expect(screen.queryByText('boom')).not.toBeInTheDocument()
    } finally {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    }
  })
})
