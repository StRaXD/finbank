import { useInfiniteQuery } from '@tanstack/react-query'
import { qk, type TransactionsFilter } from '../queryKeys.ts'
import { useApi } from './useApi.ts'

/**
 * Transactions newest first, one page of `limit` at a time (10 on the full pages, 5 on Overview).
 * `fetchNextPage` appends the next page through the previous page's `nextCursor`; the cursor is
 * never part of the key. `gcTime: 0` drops a list once nothing shows it, so switching back to a
 * filter (a tab, a page) starts again at its first page.
 */
export function useTransactions({ kind, accountId, limit }: TransactionsFilter) {
  const api = useApi()
  return useInfiniteQuery({
    queryKey: qk.transactions({ kind, accountId, limit }),
    queryFn: ({ pageParam }) => api.listTransactions({ kind, accountId, limit, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    gcTime: 0,
  })
}
