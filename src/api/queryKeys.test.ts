import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { applyInvalidation, invalidationMap, qk } from './queryKeys.ts'

describe('qk', () => {
  it('builds hierarchical keys under one root', () => {
    expect(qk.all()).toEqual(['finbank'])
    expect(qk.today()).toEqual(['finbank', 'today'])
    expect(qk.session()).toEqual(['finbank', 'session'])
    expect(qk.profile()).toEqual(['finbank', 'profile'])
    expect(qk.accounts()).toEqual(['finbank', 'accounts'])
    expect(qk.balanceSummary()).toEqual(['finbank', 'balanceSummary'])
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
      removeAccount: [qk.accounts(), qk.balanceSummary()],
    })
  })

  it('invalidates only accounts and the balance summary on removeAccount', async () => {
    const client = new QueryClient()
    client.setQueryData(qk.accounts(), [])
    client.setQueryData(qk.balanceSummary(), { totalBalanceCents: 0 })
    client.setQueryData(qk.profile(), { fullName: 'x' })
    await applyInvalidation(client, 'removeAccount')
    expect(client.getQueryState(qk.accounts())?.isInvalidated).toBe(true)
    expect(client.getQueryState(qk.balanceSummary())?.isInvalidated).toBe(true)
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
