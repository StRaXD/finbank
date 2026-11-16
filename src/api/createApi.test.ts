import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApi } from './createApi.ts'
import { ApiError } from './types.ts'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createApi', () => {
  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['"mock"', 'mock'],
  ])('builds the mock adapter when the mode is %s', async (_name, mode) => {
    vi.useFakeTimers()
    const pending = createApi(mode).getToday()
    await vi.advanceTimersByTimeAsync(200)
    await expect(pending).resolves.toBe('2023-05-19')
  })

  it('builds the http adapter for "http"', async () => {
    const error = await createApi('http').getToday().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('NOT_IMPLEMENTED')
  })

  it.each(['MOCK', 'graphql', ' '])('throws for an invalid mode %j', (mode) => {
    expect(() => createApi(mode)).toThrow(/VITE_API_MODE/)
  })
})
