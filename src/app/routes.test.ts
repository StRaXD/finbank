import { describe, expect, it } from 'vitest'
import { routes } from './routes.ts'

describe('routes', () => {
  it('builds an account details path with an encoded id', () => {
    expect(routes.accountDetails('acc_1')).toBe(`${routes.balances}/acc_1`)
    expect(routes.accountDetails('a/b')).toBe(`${routes.balances}/a%2Fb`)
  })

  it('rejects an empty account id', () => {
    expect(() => routes.accountDetails('')).toThrow(/non-empty/)
  })

  it('defines the specimen path in dev', () => {
    expect(routes.specimen).toBeDefined()
  })
})
