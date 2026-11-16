import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { applyInvalidation, invalidationMap, qk } from './queryKeys.ts'

describe('qk', () => {
  it('builds hierarchical keys under one root', () => {
    expect(qk.all()).toEqual(['finbank'])
    expect(qk.today()).toEqual(['finbank', 'today'])
    expect(qk.session()).toEqual(['finbank', 'session'])
    expect(qk.profile()).toEqual(['finbank', 'profile'])
  })

  it('returns stable, equal shapes on each call', () => {
    expect(qk.today()).toEqual(qk.today())
  })
})

describe('invalidationMap', () => {
  it('clears the whole cache on every identity change', () => {
    expect(invalidationMap).toEqual({
      login: 'all',
      loginWithGoogle: 'all',
      signup: 'all',
      logout: 'all',
    })
  })

  it("applies 'all' by emptying the cache", async () => {
    const client = new QueryClient()
    client.setQueryData(qk.today(), '2023-05-19')
    client.setQueryData(qk.profile(), { fullName: 'x' })
    await applyInvalidation(client, 'logout')
    expect(client.getQueryCache().getAll()).toHaveLength(0)
  })
})
