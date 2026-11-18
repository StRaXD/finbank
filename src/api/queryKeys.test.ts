import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { applyInvalidation, invalidationMap, qk } from './queryKeys.ts'
import type { YearMonth } from './types.ts'

describe('qk', () => {
  it('builds hierarchical keys under one root', () => {
    expect(qk.all()).toEqual(['finbank'])
    expect(qk.today()).toEqual(['finbank', 'today'])
    expect(qk.session()).toEqual(['finbank', 'session'])
    expect(qk.profile()).toEqual(['finbank', 'profile'])
    expect(qk.accounts()).toEqual(['finbank', 'accounts'])
    expect(qk.account('acc_2')).toEqual(['finbank', 'accounts', 'acc_2'])
    expect(qk.balanceSummary()).toEqual(['finbank', 'balanceSummary'])
    expect(qk.transactions()).toEqual(['finbank', 'transactions'])
    expect(qk.transactions({ kind: 'revenue', accountId: 'acc_2', limit: 10 })).toEqual([
      'finbank',
      'transactions',
      { kind: 'revenue', accountId: 'acc_2', limit: 10 },
    ])
    expect(qk.bills()).toEqual(['finbank', 'bills'])
    expect(qk.bills(2)).toEqual(['finbank', 'bills', { limit: 2 }])
    expect(qk.categorySummaries()).toEqual(['finbank', 'categorySummaries'])
    expect(qk.comparison()).toEqual(['finbank', 'comparison'])
    expect(qk.comparison('year')).toEqual(['finbank', 'comparison', 'year'])
    expect(qk.comparison('week')).toEqual(['finbank', 'comparison', 'week'])
    expect(qk.savingsGoal()).toEqual(['finbank', 'savingsGoal'])
    expect(qk.savingsGoal('2023-05' as YearMonth)).toEqual(['finbank', 'savingsGoal', '2023-05'])
    expect(qk.savingSummary()).toEqual(['finbank', 'savingSummary'])
    expect(qk.savingSummary('2023-05' as YearMonth)).toEqual(['finbank', 'savingSummary', '2023-05'])
  })

  it('never puts the cursor in a transactions key', () => {
    const filter = { kind: 'expense', limit: 5, cursor: '10' } as Parameters<typeof qk.transactions>[0]
    expect(qk.transactions(filter)).toEqual(['finbank', 'transactions', { kind: 'expense', accountId: undefined, limit: 5 }])
    expect(JSON.stringify(qk.transactions(filter))).not.toContain('cursor')
  })

  it('returns stable, equal shapes on each call', () => {
    expect(qk.today()).toEqual(qk.today())
  })
})

describe('invalidationMap', () => {
  it('clears the whole cache on every identity change and lists keys for removeAccount', () => {
    expect(invalidationMap).toEqual({
      login: 'all',
      loginWithGoogle: 'all',
      signup: 'all',
      logout: 'all',
      removeAccount: [qk.accounts(), qk.balanceSummary(), qk.transactions(), qk.categorySummaries(), qk.comparison()],
      updateSavingsGoal: [qk.savingsGoal(), qk.savingSummary()],
    })
  })

  it('invalidates every month of the savings goal and saving summary, and nothing else, on updateSavingsGoal', async () => {
    const client = new QueryClient()
    client.setQueryData(qk.savingSummary('2023-05' as YearMonth), [])
    client.setQueryData(qk.savingSummary('2023-04' as YearMonth), [])
    client.setQueryData(qk.savingsGoal('2023-05' as YearMonth), { month: '2023-05', targetCents: 1, achievedCents: 0 })
    client.setQueryData(qk.savingsGoal('2022-06' as YearMonth), { month: '2022-06', targetCents: 0, achievedCents: 0 })
    client.setQueryData(qk.accounts(), [])
    await applyInvalidation(client, 'updateSavingsGoal')
    expect(client.getQueryState(qk.savingsGoal('2023-05' as YearMonth))?.isInvalidated).toBe(true)
    expect(client.getQueryState(qk.savingsGoal('2022-06' as YearMonth))?.isInvalidated).toBe(true)
    expect(client.getQueryState(qk.savingSummary('2023-05' as YearMonth))?.isInvalidated).toBe(true)
    expect(client.getQueryState(qk.savingSummary('2023-04' as YearMonth))?.isInvalidated).toBe(true)
    expect(client.getQueryState(qk.accounts())?.isInvalidated).toBe(false)
  })

  it('invalidates accounts, the balance summary and every transaction list on removeAccount', async () => {
    const client = new QueryClient()
    client.setQueryData(qk.accounts(), [])
    client.setQueryData(qk.account('acc_2'), null)
    client.setQueryData(qk.transactions({ limit: 10 }), { pages: [], pageParams: [] })
    client.setQueryData(qk.balanceSummary(), { totalBalanceCents: 0 })
    client.setQueryData(qk.categorySummaries(), [])
    client.setQueryData(qk.comparison('year'), [])
    client.setQueryData(qk.comparison('week'), [])
    client.setQueryData(qk.profile(), { fullName: 'x' })
    await applyInvalidation(client, 'removeAccount')
    expect(client.getQueryState(qk.categorySummaries())?.isInvalidated).toBe(true)
    expect(client.getQueryState(qk.comparison('year'))?.isInvalidated).toBe(true)
    expect(client.getQueryState(qk.comparison('week'))?.isInvalidated).toBe(true)
    expect(client.getQueryState(qk.accounts())?.isInvalidated).toBe(true)
    expect(client.getQueryState(qk.account('acc_2'))?.isInvalidated).toBe(true)
    expect(client.getQueryState(qk.balanceSummary())?.isInvalidated).toBe(true)
    expect(client.getQueryState(qk.transactions({ limit: 10 }))?.isInvalidated).toBe(true)
    expect(client.getQueryState(qk.profile())?.isInvalidated).toBe(false)
    expect(client.getQueryData(qk.profile())).toEqual({ fullName: 'x' })
  })

  it("applies 'all' by emptying the cache", async () => {
    const client = new QueryClient()
    client.setQueryData(qk.today(), '2023-05-19')
    client.setQueryData(qk.profile(), { fullName: 'x' })
    await applyInvalidation(client, 'logout')
    expect(client.getQueryCache().getAll()).toHaveLength(0)
  })

  it('seeds the session instead of resetting it when given one', async () => {
    const client = new QueryClient()
    client.setQueryData(qk.today(), '2023-05-19')
    client.setQueryData(qk.session(), null)
    const observer = new QueryObserver(client, { queryKey: qk.session(), queryFn: () => null, staleTime: Infinity })
    const statuses: string[] = []
    const unsubscribe = observer.subscribe((result) => statuses.push(result.status))
    await applyInvalidation(client, 'login', { session: { userId: 'usr_1', persistent: true } })
    unsubscribe()
    expect(client.getQueryData(qk.session())).toEqual({ userId: 'usr_1', persistent: true })
    expect(client.getQueryData(qk.today())).toBeUndefined()
    expect(statuses).not.toHaveLength(0)
    expect(statuses).not.toContain('pending')
  })

  it('drops even mounted queries without refetching them when signing out', async () => {
    const client = new QueryClient()
    client.setQueryData(qk.session(), { userId: 'usr_1', persistent: true })
    let profileFetches = 0
    const observer = new QueryObserver(client, {
      queryKey: qk.profile(),
      queryFn: () => {
        profileFetches += 1
        return { fullName: 'x' }
      },
    })
    const unsubscribe = observer.subscribe(() => {})
    await waitForData(client)
    const fetchesBefore = profileFetches
    await applyInvalidation(client, 'logout', { session: null })
    await Promise.resolve()
    unsubscribe()
    expect(profileFetches).toBe(fetchesBefore)
    expect(client.getQueryData(qk.profile())).toBeUndefined()
    expect(client.getQueryData(qk.session())).toBeNull()
    expect(client.getQueryCache().getAll().map((q) => q.queryKey)).toEqual([qk.session()])
  })
})

async function waitForData(client: QueryClient) {
  for (let i = 0; i < 20 && client.getQueryData(qk.profile()) === undefined; i++) await Promise.resolve()
  expect(client.getQueryData(qk.profile())).toBeDefined()
}
