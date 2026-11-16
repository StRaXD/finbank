// Hierarchical query keys and the single invalidation map (AD-7).
import { hashKey, type QueryClient } from '@tanstack/react-query'
import type { Session } from './types.ts'

const root = ['finbank'] as const

export const qk = {
  all: () => root,
  today: () => [...root, 'today'] as const,
  session: () => [...root, 'session'] as const,
  profile: () => [...root, 'profile'] as const,
}

/** `'all'` clears the whole cache; otherwise the listed key prefixes are invalidated. */
export type InvalidationTarget = 'all' | readonly (readonly unknown[])[]

/** Each mutation's cache effect. Mutation hooks invalidate only through this map. */
export const invalidationMap = {
  login: 'all',
  loginWithGoogle: 'all',
  signup: 'all',
  logout: 'all',
} as const satisfies Record<string, InvalidationTarget>

export type InvalidatingMutation = keyof typeof invalidationMap

/**
 * Applies a mutation's `invalidationMap` entry. For `'all'` it cancels in-flight queries,
 * removes every inactive query, then resets every active (mounted) query to its initial state
 * and refetches it, resolving once those refetches settle. Afterwards the query cache holds only
 * the mounted queries, re-read under the new identity (e.g. the session). The mutation cache is
 * not touched: credential-carrying mutations set `gcTime: 0` instead.
 *
 * With `options.session` (identity changes), the session query is seeded with it instead of being
 * reset, so it never passes through `pending` and the route guards never blank the page.
 */
export async function applyInvalidation(
  queryClient: QueryClient,
  mutation: InvalidatingMutation,
  options?: { session: Session | null },
): Promise<void> {
  // Widened on purpose: today every entry is 'all', later epics add key lists.
  const target = invalidationMap[mutation] as InvalidationTarget
  if (target === 'all') {
    await queryClient.cancelQueries()
    queryClient.removeQueries({ type: 'inactive' })
    if (!options) {
      await queryClient.resetQueries()
      return
    }
    const sessionHash = hashKey(qk.session())
    queryClient.setQueryData(qk.session(), options.session)
    await queryClient.resetQueries({ predicate: (query) => query.queryHash !== sessionHash })
    return
  }
  await Promise.all(target.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}
