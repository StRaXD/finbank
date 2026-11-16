import { describe, expect, it } from 'vitest'
import { createQueryClient } from './queryClient.ts'

describe('createQueryClient', () => {
  it('uses the agreed query defaults', () => {
    expect(createQueryClient().getDefaultOptions().queries).toMatchObject({
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    })
  })
})
