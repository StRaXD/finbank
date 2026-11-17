import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FinbankApi } from '../api/port.ts'
import { seed } from '../api/mock/seed.ts'
import { formatDate, formatMoney, formatPercent } from '../lib/format.ts'
import { categoryLabels } from '../ui/categoryLabels.ts'
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

  it('renders each app route page heading when signed in', async () => {
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

  it('routes /expenses to the Expenses page with six seed-derived category cards', async () => {
    renderAt(routes.expenses, await signedInApi())
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(6))
    const housing = screen.getByRole('article', { name: 'Housing' })
    expect(within(housing).getByText('$2,023.00')).toBeInTheDocument()
  })

  it('shows the same category totals and % changes on the Overview tiles as on the Expenses cards', async () => {
    const api = await signedInApi()
    const expected = await api.listCategorySummaries()
    const readAll = async (testId: string) => {
      await waitFor(() => expect(screen.getAllByTestId(testId)).toHaveLength(6))
      return screen.getAllByTestId(testId).map((el) => ({
        name: el.querySelector('h3')?.textContent,
        trend: within(el).getByTestId('trend').textContent?.replace('*', ''),
        hasTotal: within(el).queryAllByText(formatMoney(expected.find((s) => categoryLabels[s.category] === el.querySelector('h3')?.textContent)!.totalCents, 'exact')).length > 0,
      }))
    }
    const overview = renderAt(routes.overview, api)
    const fromOverview = await readAll('category-tile')
    overview.unmount()
    renderAt(routes.expenses, api)
    const fromExpenses = await readAll('category-card')
    expect(fromOverview.map((t) => t.name)).toEqual(['Housing', 'Food', 'Transportation', 'Entertainment', 'Shopping', 'Others'])
    expect(fromOverview.every((t) => t.hasTotal)).toBe(true)
    expect(fromOverview).toEqual(fromExpenses)
    const housing = screen.getByRole('article', { name: 'Housing' })
    expect(within(housing).getByText('$2,023.00')).toBeInTheDocument()
    expect(fromOverview[3]!.trend).toBe('409% increase')
  })

  it("navigates from an Overview tile's → to Expenses", async () => {
    const { router } = renderAt(routes.overview, await signedInApi())
    const food = await screen.findByRole('article', { name: 'Food' })
    const link = within(food).getByRole('link', { name: 'View Food expenses' })
    expect(link).toHaveAttribute('href', routes.expenses)
    fireEvent.click(link)
    expect(await screen.findByRole('heading', { level: 1, name: 'Expenses' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(routes.expenses)
  })

  it('updates the Overview tiles after an account removal', async () => {
    const api = await signedInApi()
    const before = await api.listCategorySummaries()
    const { router } = renderAt(routes.overview, api)
    await waitFor(() => expect(screen.getAllByTestId('category-tile')).toHaveLength(6))
    const totalsShown = () =>
      screen.getAllByTestId('category-tile').map((el, i) => within(el).queryByText(formatMoney(after[i]!.totalCents, 'exact')) !== null)
    let after = before

    await act(() => router.navigate(routes.balances))
    const loan = await screen.findByRole('article', { name: 'Loan' })
    fireEvent.click(within(loan).getByRole('button', { name: 'Remove' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Remove account?' })).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(screen.getAllByTestId('account-card')).toHaveLength(4))
    after = await api.listCategorySummaries()
    expect(after.map((s) => s.totalCents), 'acc_5 should carry May category expenses').not.toEqual(before.map((s) => s.totalCents))

    await act(() => router.navigate(routes.overview))
    await waitFor(() => expect(screen.getAllByTestId('category-tile')).toHaveLength(6))
    await waitFor(() => expect(totalsShown()).toEqual([true, true, true, true, true, true]))
    const trends = screen.getAllByTestId('category-tile').map((el) => within(el).getByTestId('trend').textContent)
    expect(trends).toEqual(after.map((s) => expect.stringMatching(new RegExp(`^${formatPercent(s.changePct)}\\*`))))
  })

  it('shows the same Monthly series and fitted ladder on Overview Statistics as on Expenses', async () => {
    const chartOf = async (region: HTMLElement) => {
      const summary = (await within(region).findByText(/^Monthly expenses/)).textContent
      const labels = (axis: 'x' | 'y') =>
        [
          ...within(region)
            .getByTestId('comparison-chart')
            .querySelectorAll(`.recharts-${axis}Axis-tick-labels .recharts-cartesian-axis-tick-value`),
        ].map((t) => t.textContent)
      await waitFor(() => expect(labels('x')).toHaveLength(12))
      const bars = [...within(region).getByTestId('comparison-chart').querySelectorAll('.recharts-bar-rectangle path')].map(
        (bar) => [bar.getAttribute('fill'), bar.getAttribute('height')],
      )
      return { summary, x: labels('x'), y: labels('y'), bars }
    }

    const api = await signedInApi()
    const overview = renderAt(routes.overview, api)
    const stats = await screen.findByRole('region', { name: 'Statistics' })
    expect(within(stats).getByRole('button', { name: /Comparison period/ })).toHaveTextContent('Weekly Comparison')
    await waitFor(() =>
      expect(
        [...stats.querySelectorAll('.recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value')].map((t) => t.textContent),
      ).toEqual(['$0', '$200', '$1k', '$5k', '$25k']),
    )
    fireEvent.click(within(stats).getByRole('button', { name: /Comparison period/ }))
    fireEvent.click(screen.getByRole('option', { name: 'Monthly Comparison' }))
    const fromOverview = await chartOf(stats)
    overview.unmount()

    renderAt(routes.expenses, api)
    const comparison = await screen.findByRole('region', { name: 'Expenses Comparison' })
    const fromExpenses = await chartOf(comparison)
    expect(fromExpenses.y).toEqual(['$0', '$200', '$1k', '$5k', '$25k'])
    expect(fromExpenses.bars.length).toBeGreaterThan(12)
    expect(fromOverview).toEqual(fromExpenses)
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

  it('shows the derived total and every account on Overview, and updates both after a removal on Balances', async () => {
    const { router } = renderAt(routes.overview, await signedInApi())
    expect(await screen.findByText('$240,399')).toBeInTheDocument()
    const carousel = await screen.findByRole('region', { name: 'Accounts' })
    expect(within(carousel).getAllByRole('button', { name: /^Show slide/ })).toHaveLength(5)

    await act(() => router.navigate(routes.balances))
    const checking = await screen.findByRole('article', { name: 'Checking' })
    fireEvent.click(within(checking).getByRole('button', { name: 'Remove' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Remove account?' })).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(screen.getAllByTestId('account-card')).toHaveLength(4))

    await act(() => router.navigate(routes.overview))
    expect(await screen.findByText('$215,343')).toBeInTheDocument()
    const after = await screen.findByRole('region', { name: 'Accounts' })
    await waitFor(() => expect(within(after).getAllByRole('button', { name: /^Show slide/ })).toHaveLength(4))
    const next = within(after).getByRole('button', { name: 'Next' })
    const names: string[] = []
    // Capped, so a Next that never disables fails here instead of hanging until the timeout.
    for (let step = 0; step < 10 && !next.hasAttribute('disabled'); step++) {
      names.push(within(after).getByRole('heading').textContent ?? '')
      fireEvent.click(next)
    }
    names.push(within(after).getByRole('heading').textContent ?? '')
    expect(next, 'Next never disabled within 10 slides').toBeDisabled()
    expect(names).toEqual(['Credit Card', 'Savings', 'Investment', 'Loan'])
    expect(screen.queryByText('$240,399')).not.toBeInTheDocument()
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
    const balancesHeading = await screen.findByRole('heading', { level: 1, name: 'Balances' })
    expect(router.state.location.pathname).toBe(routes.balances)
    // The Remove button left with Account Details: focus lands on the Balances title, not <body>.
    await waitFor(() => expect(balancesHeading).toHaveFocus())
    await waitFor(() => expect(screen.getAllByTestId('account-card')).toHaveLength(4))
    expect(balancesHeading).toHaveFocus()
    expect(screen.queryByRole('article', { name: 'Checking' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await act(() => router.navigate(routes.transactions))
    await screen.findByRole('table', { name: 'Transactions' })
    // Capped, so a Load More that never disappears fails instead of hanging.
    let more = screen.queryByRole('button', { name: 'Load More' })
    for (let clicks = 0; more && clicks < 20; clicks++) {
      const count = within(screen.getByRole('table')).getAllByRole('row').length
      fireEvent.click(more)
      await waitFor(() => expect(within(screen.getByRole('table')).getAllByRole('row').length).toBeGreaterThan(count))
      more = screen.queryByRole('button', { name: 'Load More' })
    }
    expect(more, 'Load More still shown after 20 pages').toBeNull()
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

  describe('Overview widgets read the same records as their pages', () => {
    const region = (name: string) => screen.getByRole('region', { name })
    const tableRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)
    const overviewTxnRows = () =>
      within(region('Recent Transaction'))
        .getAllByRole('listitem')
        .map((row) => row.textContent)
    // A seed transaction as the Overview compact row reads: item, shop, amount, date.
    const rowOf = (t: (typeof seed.transactions)[number]) =>
      `${t.item}${t.shop}${formatMoney(t.amountCents, 'exact')}${formatDate(t.date, 'row')}`
    // The Transactions table cells as the Overview compact row orders them: item, shop, amount, date.
    const pageTxnRows = () =>
      tableRows()
        .slice(0, 5)
        .map((row) => {
          const [item, shop, date, , amount] = within(row).getAllByRole('cell').map((c) => c.textContent)
          return `${item}${shop}${amount}${date}`
        })

    it('shows the first two /bills rows (due date, last charge, amount) in Upcoming Bill', async () => {
      const { router } = renderAt(routes.overview, await signedInApi())
      const compact = await within(await screen.findByRole('region', { name: 'Upcoming Bill' })).findAllByRole('listitem')
      const overview = compact.map((row) => ({
        due: within(row).getByRole('img', { name: /^Due / }).getAttribute('aria-label'),
        lastCharge: within(row).getByText(/^Last Charge - /).textContent?.replace('Last Charge - ', ''),
        amount: within(row).getByText(/^\$/).textContent,
      }))
      expect(overview).toEqual([
        { due: 'Due May 25', lastCharge: expect.any(String), amount: '$150' },
        { due: 'Due Jun 16', lastCharge: expect.any(String), amount: '$559' },
      ])
      expect(within(compact[0]!).getByText('Figma')).toBeInTheDocument()
      expect(within(compact[1]!).getByText('Adobe')).toBeInTheDocument()

      fireEvent.click(within(region('Upcoming Bill')).getByRole('link', { name: 'View All bills' }))
      await screen.findByRole('table', { name: 'Upcoming Bills' })
      expect(router.state.location.pathname).toBe(routes.bills)
      const page = tableRows()
        .slice(0, 2)
        .map((row) => {
          const cells = within(row).getAllByRole('cell')
          return {
            due: within(cells[0]!).getByRole('img').getAttribute('aria-label'),
            lastCharge: cells[3]!.textContent,
            amount: cells[4]!.textContent,
          }
        })
      expect(page).toEqual(overview)
    })

    it('shows the first five /transactions rows in Recent Transaction, on All and on Revenue', async () => {
      const { router } = renderAt(routes.overview, await signedInApi())
      await within(await screen.findByRole('region', { name: 'Recent Transaction' })).findAllByRole('listitem')
      const all = overviewTxnRows()
      expect(all).toHaveLength(5)
      fireEvent.click(within(region('Recent Transaction')).getByRole('tab', { name: 'Revenue' }))
      await waitFor(() => expect(overviewTxnRows()).not.toEqual(all))
      const revenue = overviewTxnRows()
      expect(revenue).toHaveLength(5)

      fireEvent.click(within(region('Recent Transaction')).getByRole('link', { name: 'View All transactions' }))
      await screen.findByRole('table', { name: 'Transactions' })
      expect(router.state.location.pathname).toBe(routes.transactions)
      expect(pageTxnRows()).toEqual(all)
      expect(all).toEqual(seed.transactions.slice(0, 5).map(rowOf))
      expect(seed.transactions.slice(0, 5).map((t) => t.item)).toEqual([
        'GTR 5',
        'Polo shirt',
        'Biriyani',
        'Movie ticket',
        'Taxi fare',
      ])
      const before = pageTxnRows()
      fireEvent.click(screen.getByRole('tab', { name: 'Revenue' }))
      await waitFor(() => expect(pageTxnRows()).not.toEqual(before))
      expect(pageTxnRows()).toEqual(revenue)
    })

    it('drops a removed account’s transactions from Recent Transaction', async () => {
      const { router } = renderAt(routes.overview, await signedInApi())
      await within(await screen.findByRole('region', { name: 'Recent Transaction' })).findAllByRole('listitem')
      const revenueTab = () => within(region('Recent Transaction')).getByRole('tab', { name: 'Revenue' })
      const newest = (accountId?: string) =>
        seed.transactions
          .filter((t) => t.kind === 'revenue' && t.accountId !== accountId)
          .slice(0, 5)
          .map(rowOf)
      // Checking's salary is the newest revenue, so it heads the Revenue tab before the removal.
      fireEvent.click(revenueTab())
      await waitFor(() => expect(overviewTxnRows()).toEqual(newest()))
      expect(seed.transactions.filter((t) => t.kind === 'revenue')[0]!.accountId).toBe('acc_2')

      await act(() => router.navigate(routes.balances))
      const checking = await screen.findByRole('article', { name: 'Checking' })
      fireEvent.click(within(checking).getByRole('button', { name: 'Remove' }))
      fireEvent.click(within(screen.getByRole('dialog', { name: 'Remove account?' })).getByRole('button', { name: 'Remove' }))
      await waitFor(() => expect(screen.getAllByTestId('account-card')).toHaveLength(4))

      await act(() => router.navigate(routes.overview))
      const remaining = seed.transactions.filter((t) => t.accountId !== 'acc_2')
      await waitFor(() => expect(overviewTxnRows()).toEqual(remaining.slice(0, 5).map(rowOf)))
      fireEvent.click(revenueTab())
      await waitFor(() => expect(overviewTxnRows()).toEqual(newest('acc_2')))
      const checkingRows = new Set(seed.transactions.filter((t) => t.accountId === 'acc_2').map(rowOf))
      expect(overviewTxnRows().filter((row) => checkingRows.has(row ?? ''))).toEqual([])
    })
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
