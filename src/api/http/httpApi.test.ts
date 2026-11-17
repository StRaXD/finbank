import { afterEach, describe, expect, it, vi } from 'vitest'
import { FINBANK_API_METHODS } from '../port.ts'
import { ApiError } from '../types.ts'
import { createHttpApi } from './httpApi.ts'

describe('http adapter stub', () => {
  const api = createHttpApi({ baseUrl: 'https://api.example.test' })

  it('implements exactly the port methods', () => {
    expect(Object.keys(api).sort()).toEqual([...FINBANK_API_METHODS].sort())
  })

  it.each(FINBANK_API_METHODS)('%s rejects with NOT_IMPLEMENTED', async (method) => {
    const call = api[method] as (...args: unknown[]) => Promise<unknown>
    const error: unknown = await call().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('NOT_IMPLEMENTED')
    expect((error as ApiError).message).toContain(method)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults the base URL from VITE_API_BASE_URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://x.test')
    const error = await createHttpApi().getToday().catch((e: unknown) => e)
    expect((error as ApiError).message).toContain('https://x.test')
  })

  it('lets an explicit baseUrl override the env', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://x.test')
    const error = await createHttpApi({ baseUrl: 'https://override.test' })
      .getToday()
      .catch((e: unknown) => e)
    expect((error as ApiError).message).toContain('https://override.test')
    expect((error as ApiError).message).not.toContain('https://x.test')
  })
})
