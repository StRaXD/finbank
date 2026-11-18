import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiProvider } from '../ApiProvider.tsx'
import { createMockApi } from '../mock/mockApi.ts'
import { seed } from '../mock/seed.ts'
import { qk } from '../queryKeys.ts'
import type { YearMonth } from '../types.ts'
import { SessionProvider } from '../SessionProvider.tsx'
import { useSessionContext } from '../sessionContext.ts'
import { useAccount } from './useAccount.ts'
import { useAccounts } from './useAccounts.ts'
import { useApi } from './useApi.ts'
import { useBalanceSummary } from './useBalanceSummary.ts'
import { useBills } from './useBills.ts'
import { useCategoryLimits } from './useCategoryLimits.ts'
import { useCategorySummaries } from './useCategorySummaries.ts'
import { useComparison } from './useComparison.ts'
import { useLogin } from './useLogin.ts'
import { useLoginWithGoogle } from './useLoginWithGoogle.ts'
import { useLogout } from './useLogout.ts'
import { useProfile } from './useProfile.ts'
import { useRemoveAccount } from './useRemoveAccount.ts'
import { useRequestPasswordReset } from './useRequestPasswordReset.ts'
import { useSavingSummary } from './useSavingSummary.ts'
import { useSavingsGoal } from './useSavingsGoal.ts'
import { useUpdateCategoryLimit } from './useUpdateCategoryLimit.ts'
import { useUpdateProfile } from './useUpdateProfile.ts'
import { useUpdateSavingsGoal } from './useUpdateSavingsGoal.ts'
import { useSession } from './useSession.ts'
import { useSignup } from './useSignup.ts'
import { useToday } from './useToday.ts'
import { useTransactions } from './useTransactions.ts'

function setup() {
  const api = createMockApi({
    storage: localStorage,
    sessionStores: { local: localStorage, session: sessionStorage },
    delayMs: 0,
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>{children}</SessionProvider>
      </QueryClientProvider>
    </ApiProvider>
  )
  return { api, queryClient, wrapper }
}

afterEach(() => {
  vi.restoreAllMocks()
})

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('query hooks', () => {
  it('useToday resolves mock today', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useToday(), { wrapper })
    await waitFor(() => expect(result.current.data).toBe('2023-05-19'))
  })

  it('useProfile resolves the seeded user', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useProfile(), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(seed.profile))
  })

  it('useAccounts and useBalanceSummary resolve the seeded accounts and derived total', async () => {
    const { wrapper, queryClient } = setup()
    const { result } = renderHook(() => ({ accounts: useAccounts(), summary: useBalanceSummary() }), {
      wrapper,
    })
    await waitFor(() => expect(result.current.accounts.data).toEqual(seed.accounts))
    await waitFor(() => expect(result.current.summary.data).toEqual({ totalBalanceCents: 24_039_900 }))
    expect(queryClient.getQueryData(qk.accounts())).toEqual(seed.accounts)
    expect(queryClient.getQueryData(qk.balanceSummary())).toEqual({ totalBalanceCents: 24_039_900 })
  })

  it('useAccount resolves one account by id, and null for an unknown id', async () => {
    const { wrapper, queryClient } = setup()
    const { result } = renderHook(() => ({ known: useAccount('acc_2'), unknown: useAccount('nope') }), { wrapper })
    await waitFor(() => expect(result.current.known.data).toEqual(seed.accounts[1]))
    await waitFor(() => expect(result.current.unknown.isSuccess).toBe(true))
    expect(result.current.unknown.data).toBeNull()
    expect(queryClient.getQueryData(qk.account('acc_2'))).toEqual(seed.accounts[1])
  })

  it('useTransactions chains pages through nextCursor, keyed without the cursor', async () => {
    const { wrapper, queryClient, api } = setup()
    const spy = vi.spyOn(api, 'listTransactions')
    const { result } = renderHook(() => useTransactions({ kind: 'expense', limit: 10 }), { wrapper })
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1))
    expect(spy).toHaveBeenLastCalledWith({ kind: 'expense', accountId: undefined, limit: 10, cursor: undefined })
    const first = result.current.data!.pages[0]!
    expect(first.items).toHaveLength(10)
    expect(first.items[0]!.item).toBe('GTR 5')
    expect(result.current.hasNextPage).toBe(true)

    await act(() => result.current.fetchNextPage())
    expect(spy).toHaveBeenLastCalledWith({ kind: 'expense', accountId: undefined, limit: 10, cursor: first.nextCursor })
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))
    expect(queryClient.getQueryData(qk.transactions({ kind: 'expense', limit: 10 }))).toBeDefined()

    while (result.current.hasNextPage) await act(() => result.current.fetchNextPage())
    const ids = result.current.data!.pages.flatMap((page) => page.items.map((t) => t.id))
    const expenses = seed.transactions.filter((t) => t.kind === 'expense')
    expect(ids).toHaveLength(expenses.length)
    expect(new Set(ids).size).toBe(ids.length)
    expect(result.current.data!.pages.at(-1)!.nextCursor).toBeNull()
  })

  it('useBills resolves the bills by due date, keyed by limit', async () => {
    const { wrapper, queryClient, api } = setup()
    const spy = vi.spyOn(api, 'listBills')
    const { result } = renderHook(() => ({ all: useBills(), two: useBills({ limit: 2 }) }), { wrapper })
    await waitFor(() => expect(result.current.all.data).toEqual(seed.bills))
    await waitFor(() => expect(result.current.two.data?.map((b) => b.vendor)).toEqual(['Figma', 'Adobe']))
    expect(spy).toHaveBeenCalledWith({})
    expect(spy).toHaveBeenCalledWith({ limit: 2 })
    expect(queryClient.getQueryData(qk.bills())).toEqual(seed.bills)
    expect(queryClient.getQueryData(qk.bills(2))).toHaveLength(2)
  })

  it('useCategorySummaries resolves the six summaries under its key', async () => {
    const { wrapper, queryClient } = setup()
    const { result } = renderHook(() => useCategorySummaries(), { wrapper })
    await waitFor(() => expect(result.current.data).toHaveLength(6))
    expect(result.current.data!.map((s) => s.category)).toEqual([
      'housing',
      'food',
      'transportation',
      'entertainment',
      'shopping',
      'others',
    ])
    expect(queryClient.getQueryData(qk.categorySummaries())).toEqual(result.current.data)
  })

  it('useComparison resolves each granularity under its own key', async () => {
    const { wrapper, queryClient, api } = setup()
    const spy = vi.spyOn(api, 'getComparison')
    const { result } = renderHook(() => ({ year: useComparison('year'), week: useComparison('week') }), { wrapper })
    await waitFor(() => expect(result.current.year.data).toHaveLength(12))
    await waitFor(() => expect(result.current.week.data).toHaveLength(7))
    expect(spy).toHaveBeenCalledWith('year')
    expect(spy).toHaveBeenCalledWith('week')
    expect(result.current.week.data![0]!.label).toBe('14 Sun')
    expect(queryClient.getQueryData(qk.comparison('year'))).toEqual(result.current.year.data)
    expect(queryClient.getQueryData(qk.comparison('week'))).toEqual(result.current.week.data)
  })

  it('useSavingsGoal resolves each month under its own key', async () => {
    const { wrapper, queryClient } = setup()
    const may = '2023-05' as YearMonth
    const apr = '2023-04' as YearMonth
    const { result } = renderHook(() => ({ may: useSavingsGoal(may), apr: useSavingsGoal(apr) }), { wrapper })
    await waitFor(() => expect(result.current.may.data).toEqual({ month: may, targetCents: 2_000_000, achievedCents: 1_250_000 }))
    await waitFor(() => expect(result.current.apr.data).toMatchObject({ targetCents: 1_800_000, achievedCents: 1_710_000 }))
    expect(queryClient.getQueryData(qk.savingsGoal(may))).toEqual(result.current.may.data)
    expect(queryClient.getQueryData(qk.savingsGoal(apr))).toEqual(result.current.apr.data)
  })

  it('useSavingSummary resolves a month and refetches after useUpdateSavingsGoal', async () => {
    const { wrapper, queryClient } = setup()
    const may = '2023-05' as YearMonth
    const { result } = renderHook(() => ({ summary: useSavingSummary(may), update: useUpdateSavingsGoal() }), { wrapper })
    await waitFor(() => expect(result.current.summary.data).toHaveLength(31))
    expect(queryClient.getQueryData(qk.savingSummary(may))).toEqual(result.current.summary.data)
    const total = () => (result.current.summary.data ?? []).reduce((a, p) => a + (p.currentCents ?? 0), 0)
    expect(total()).toBe(1_250_000)
    await act(() => result.current.update.mutateAsync({ month: may, targetCents: 1, achievedCents: 400_000 }))
    // The mutation resolves only after the active query has refetched: the cache already holds
    // the new series, synchronously. The hook then sees it after TanStack's one setTimeout(0)
    // notify batch (flushed once, not polled).
    const cached = queryClient.getQueryData<{ currentCents: number | null }[]>(qk.savingSummary(may)) ?? []
    expect(cached.reduce((a, p) => a + (p.currentCents ?? 0), 0)).toBe(400_000)
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
    expect(total()).toBe(400_000)
  })

  it('useCategoryLimits lists the six limits and refetches after useUpdateCategoryLimit', async () => {
    const { wrapper, queryClient } = setup()
    const { result } = renderHook(() => ({ limits: useCategoryLimits(), update: useUpdateCategoryLimit() }), { wrapper })
    await waitFor(() => expect(result.current.limits.data).toHaveLength(6))
    expect(queryClient.getQueryData(qk.categoryLimits())).toEqual(result.current.limits.data)
    await act(() => result.current.update.mutateAsync({ category: 'food', limitCents: 65_000 }))
    // The mutation resolves only after the active query has refetched.
    const cached = queryClient.getQueryData<{ category: string; limitCents: number }[]>(qk.categoryLimits())
    expect(cached?.[1]).toEqual({ category: 'food', limitCents: 65_000 })
    // The hook sees it after TanStack's one setTimeout(0) notify batch (flushed once, not polled).
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
    expect(result.current.limits.data?.[1]).toEqual({ category: 'food', limitCents: 65_000 })
  })

  it('useProfile refetches after useUpdateProfile', async () => {
    const { wrapper, queryClient } = setup()
    const { result } = renderHook(() => ({ profile: useProfile(), update: useUpdateProfile() }), { wrapper })
    await waitFor(() => expect(result.current.profile.data).toEqual(seed.profile))
    const input = {
      fullName: 'Jane Doe',
      email: 'jane.doe@email.com',
      username: 'jane.doe',
      phoneCountryCode: '+44',
      phoneNumber: '7700 900123',
    }
    await act(() => result.current.update.mutateAsync(input))
    // The mutation resolves only after the active profile query has refetched.
    expect(queryClient.getQueryData(qk.profile())).toEqual({ ...input, avatarUrl: seed.profile.avatarUrl })
    await waitFor(() => expect(result.current.profile.data?.fullName).toBe('Jane Doe'))
  })

  it('useSession is null when signed out', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useSession(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })
})

describe('mutation hooks', () => {
  it('useLogin clears the cache and the session is seeded as signed in', async () => {
    const { wrapper, queryClient } = setup()
    const { result } = renderHook(
      () => ({ session: useSession(), context: useSessionContext(), login: useLogin() }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.session.data).toBeNull())
    await queryClient.fetchQuery({ queryKey: qk.today(), queryFn: () => 'stale' })

    await act(() =>
      result.current.login.mutateAsync({ email: 'a@b.co', password: 'pw', persistent: true }),
    )

    // The session is seeded in the cache at once; observers re-render on the next notify tick.
    expect(queryClient.getQueryData(qk.session())).toEqual({ userId: 'usr_1', persistent: true })
    await waitFor(() => expect(result.current.session.data).toEqual({ userId: 'usr_1', persistent: true }))
    await waitFor(() => expect(result.current.context.data).toEqual({ userId: 'usr_1', persistent: true }))
    expect(queryClient.getQueryData(qk.today())).toBeUndefined()
  })

  it.each([
    ['useLoginWithGoogle', () => useLoginWithGoogle(), { persistent: true }],
    ['useSignup', () => useSignup(), { name: 'Jane', email: 'jane@doe.com', password: 'pw' }],
  ])('%s signs in persistently', async (_name, useMutationHook, input) => {
    const { wrapper } = setup()
    const { result } = renderHook(
      () => ({ session: useSession(), mutation: useMutationHook() }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.session.data).toBeNull())
    await act(() => (result.current.mutation.mutateAsync as (i: unknown) => Promise<unknown>)(input))
    await waitFor(() => expect(result.current.session.data).toEqual({ userId: 'usr_1', persistent: true }))
  })

  it('useLogout gives a null session and an empty cache', async () => {
    localStorage.setItem('finbank:session', JSON.stringify({ userId: 'usr_1', persistent: true }))
    const { wrapper, queryClient } = setup()
    const { result } = renderHook(() => ({ session: useSession(), logout: useLogout() }), {
      wrapper,
    })
    await waitFor(() => expect(result.current.session.data).toEqual({ userId: 'usr_1', persistent: true }))
    await queryClient.fetchQuery({ queryKey: qk.profile(), queryFn: () => seed.profile })
    await queryClient.fetchQuery({ queryKey: qk.today(), queryFn: () => '2023-05-19' })

    await act(() => result.current.logout.mutateAsync())

    expect(queryClient.getQueryData(qk.session())).toBeNull()
    await waitFor(() => expect(result.current.session.data).toBeNull())
    // Only the mounted session query remains, seeded as signed out.
    const keys = queryClient.getQueryCache().getAll().map((q) => q.queryKey)
    expect(keys).toEqual([qk.session()])
  })

  it.each([
    ['useLogin', () => useLogin(), { email: 'bad', password: '', persistent: true }],
    ['useSignup', () => useSignup(), { name: '', email: 'bad', password: '' }],
  ])('a VALIDATION failure in %s leaves the cache and session intact', async (_name, useHook, input) => {
    const { wrapper, queryClient } = setup()
    const { result } = renderHook(() => ({ session: useSession(), mutation: useHook() }), { wrapper })
    await waitFor(() => expect(result.current.session.data).toBeNull())
    await queryClient.fetchQuery({ queryKey: qk.today(), queryFn: () => '2023-05-19' })

    const mutate = result.current.mutation.mutateAsync as (i: unknown) => Promise<unknown>
    const error = await act(() => mutate(input).catch((e: unknown) => e))

    expect(error).toMatchObject({ code: 'VALIDATION' })
    expect(queryClient.getQueryData(qk.today())).toBe('2023-05-19')
    expect(queryClient.getQueryState(qk.session())?.dataUpdateCount).toBe(1)
    expect(result.current.session.data).toBeNull()
  })

  it.each([
    ['useLogin', () => useLogin(), { email: 'a@b.co', password: 'secret', persistent: true }],
    ['useSignup', () => useSignup(), { name: 'Jane', email: 'a@b.co', password: 'secret' }],
    ['useLoginWithGoogle', () => useLoginWithGoogle(), { persistent: true }],
    ['useRequestPasswordReset', () => useRequestPasswordReset(), 'a@b.co'],
  ])('%s does not keep its variables in the mutation cache once unmounted', async (_name, useHook, input) => {
    const { wrapper, queryClient } = setup()
    const { result, unmount } = renderHook(() => useHook(), { wrapper })
    await act(() => (result.current.mutateAsync as (i: unknown) => Promise<unknown>)(input))
    unmount()
    await waitFor(() => expect(queryClient.getMutationCache().getAll()).toHaveLength(0))
  })

  it('useRequestPasswordReset resolves for a valid email and surfaces VALIDATION', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useRequestPasswordReset(), { wrapper })
    await act(() => result.current.mutateAsync('a@b.co'))
    await act(() => result.current.mutateAsync('bad').catch(() => {}))
    await waitFor(() => expect(result.current.error).toMatchObject({ code: 'VALIDATION' }))
  })

  it('useRemoveAccount refetches accounts and the balance summary before it settles', async () => {
    const { wrapper, queryClient } = setup()
    const { result } = renderHook(
      () => ({ accounts: useAccounts(), summary: useBalanceSummary(), remove: useRemoveAccount() }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.accounts.data).toHaveLength(5))
    await waitFor(() => expect(result.current.summary.data).toEqual({ totalBalanceCents: 24_039_900 }))

    await act(() => result.current.remove.mutateAsync('acc_2'))

    // Read straight after it settles: the mutation resolved only once the active queries refetched.
    const ids = queryClient.getQueryData<{ id: string }[]>(qk.accounts())?.map((a) => a.id)
    expect(ids).toEqual(['acc_1', 'acc_3', 'acc_4', 'acc_5'])
    expect(queryClient.getQueryData(qk.balanceSummary())).toEqual({ totalBalanceCents: 21_534_300 })
    await waitFor(() => expect(result.current.summary.data).toEqual({ totalBalanceCents: 21_534_300 }))
  })

  it('useRemoveAccount refetches the mounted category summaries', async () => {
    const { wrapper, queryClient } = setup()
    const { result } = renderHook(() => ({ summaries: useCategorySummaries(), remove: useRemoveAccount() }), {
      wrapper,
    })
    await waitFor(() => expect(result.current.summaries.data?.[0]?.totalCents).toBe(202_300))
    await act(() => result.current.remove.mutateAsync('acc_5'))
    // Read straight after it settles: the mutation resolved only once the active queries refetched.
    const housing = { category: 'housing', totalCents: 174_300, changePct: 43 }
    expect(queryClient.getQueryData<{ category: string }[]>(qk.categorySummaries())?.[0]).toMatchObject(housing)
    await waitFor(() => expect(result.current.summaries.data?.[0]).toMatchObject(housing))
  })

  it('useRemoveAccount refetches the mounted comparison series', async () => {
    const { wrapper, queryClient } = setup()
    const { result } = renderHook(() => ({ year: useComparison('year'), remove: useRemoveAccount() }), { wrapper })
    await waitFor(() => expect(result.current.year.data?.[4]?.currentCents).toBe(742_809))
    await act(() => result.current.remove.mutateAsync('acc_5'))
    expect(queryClient.getQueryData<{ currentCents: number | null }[]>(qk.comparison('year'))?.[4]?.currentCents).toBe(
      594_309,
    )
    await waitFor(() => expect(result.current.year.data?.[4]?.currentCents).toBe(594_309))
  })

  it('mutations call the adapter from ApiProvider', async () => {
    const { wrapper, api } = setup()
    const spy = vi.spyOn(api, 'logout')
    const { result } = renderHook(() => useLogout(), { wrapper })
    await act(() => result.current.mutateAsync())
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describe('providers', () => {
  it('useApi throws outside ApiProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useApi())).toThrow(/ApiProvider/)
  })

  it('useSessionContext throws outside SessionProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useSessionContext())).toThrow(/SessionProvider/)
  })
})
