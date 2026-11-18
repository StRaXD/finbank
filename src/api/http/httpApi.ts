// The future adapter (AD-3). It implements the whole port; every method is a stub for now.
import type { FinbankApi } from '../port.ts'
import { ApiError } from '../types.ts'

export type HttpApiOptions = {
  /** Defaults to `VITE_API_BASE_URL`. */
  baseUrl?: string
}

export function createHttpApi(options: HttpApiOptions = {}): FinbankApi {
  const baseUrl = options.baseUrl ?? import.meta.env.VITE_API_BASE_URL ?? ''
  const target = baseUrl === '' ? '' : ` (${baseUrl})`

  const notImplemented = (method: string) => (): Promise<never> =>
    Promise.reject(
      new ApiError('NOT_IMPLEMENTED', `${method} is not implemented by the http adapter${target}.`),
    )

  return {
    getToday: notImplemented('getToday'),
    login: notImplemented('login'),
    loginWithGoogle: notImplemented('loginWithGoogle'),
    signup: notImplemented('signup'),
    logout: notImplemented('logout'),
    requestPasswordReset: notImplemented('requestPasswordReset'),
    getSession: notImplemented('getSession'),
    getProfile: notImplemented('getProfile'),
    listAccounts: notImplemented('listAccounts'),
    getAccount: notImplemented('getAccount'),
    getBalanceSummary: notImplemented('getBalanceSummary'),
    removeAccount: notImplemented('removeAccount'),
    listTransactions: notImplemented('listTransactions'),
    listBills: notImplemented('listBills'),
    listCategorySummaries: notImplemented('listCategorySummaries'),
    getComparison: notImplemented('getComparison'),
    getSavingsGoal: notImplemented('getSavingsGoal'),
  }
}
