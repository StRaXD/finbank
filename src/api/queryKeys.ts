// Hierarchical query keys and the single invalidation map (AD-7).
import { hashKey, type QueryClient } from '@tanstack/react-query'
import type { Session } from './types.ts'

const root = ['finbank'] as const

export const qk = {
  all: () => root,
  today: () => [...root, 'today'] as const,
  session: () => [...root, 'session'] as const,
  profile: () => [...root, 'profile'] as const,
  accounts: () => [...root, 'accounts'] as const,
  balanceSummary: () => [...root, 'balanceSummary'] as const,
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
 * reset, so it never passes through `pending` and the route guards never blank the page. When
 * that session is `null` (signed out), every other query is removed instead of reset, even a
 * mounted one, so it is not refetched in place (a still-mounted observer that re-renders may
 * re-create its own query, as RequireSession's `useToday` does once).
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
    const notSession = (query: { queryHash: string }) => query.queryHash !== sessionHash
    queryClient.setQueryData(qk.session(), options.session)
    if (options.session === null) {
      // Signed out: every non-session query is removed rather than reset, so signed-in data such
      // as the shell's profile is not refetched or kept. An observer that re-renders before the
      // guards unmount it can still re-create its query: RequireSession's `useToday` refetches
      // today once after logout.
      queryClient.removeQueries({ predicate: notSession })
      return
    }
    await queryClient.resetQueries({ predicate: notSession })
    return
  }
  await Promise.all(target.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}
