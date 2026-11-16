// Hierarchical query keys and the single invalidation map (AD-7).
import type { QueryClient } from '@tanstack/react-query'

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
 */
export async function applyInvalidation(
  queryClient: QueryClient,
  mutation: InvalidatingMutation,
): Promise<void> {
  // Widened on purpose: today every entry is 'all', later epics add key lists.
  const target = invalidationMap[mutation] as InvalidationTarget
  if (target === 'all') {
    await queryClient.cancelQueries()
    queryClient.removeQueries({ type: 'inactive' })
    await queryClient.resetQueries()
    return
  }
  await Promise.all(target.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}
