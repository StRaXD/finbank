import type {
  Account,
  BalanceSummary,
  GoogleLoginInput,
  IsoDate,
  ListTransactionsInput,
  LoginInput,
  Session,
  SignupInput,
  TransactionPage,
  UserProfile,
} from './types.ts'

/** The single data port (AD-2/AD-3). Every adapter implements all of it. Later epics extend it. */
export interface FinbankApi {
  getToday(): Promise<IsoDate>
  login(input: LoginInput): Promise<Session>
  loginWithGoogle(input: GoogleLoginInput): Promise<Session>
  signup(input: SignupInput): Promise<Session>
  logout(): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  getSession(): Promise<Session | null>
  getProfile(): Promise<UserProfile>
  /** Every account, in stored (seed) order. */
  listAccounts(): Promise<Account[]>
  /** One account (a copy), or `null` for an unknown id. */
  getAccount(id: string): Promise<Account | null>
  getBalanceSummary(): Promise<BalanceSummary>
  /** Removes an account and persists it. An unknown id resolves as a no-op (idempotent). */
  removeAccount(id: string): Promise<void>
  /**
   * One page of transactions, newest first (equal dates keep stored order), optionally filtered
   * by kind and account. A bad `limit` or cursor rejects with `VALIDATION`.
   */
  listTransactions(input: ListTransactionsInput): Promise<TransactionPage>
}

/** Every port method name, for tests that must cover the whole port. */
export const FINBANK_API_METHODS = [
  'getToday',
  'login',
  'loginWithGoogle',
  'signup',
  'logout',
  'requestPasswordReset',
  'getSession',
  'getProfile',
  'listAccounts',
  'getAccount',
  'getBalanceSummary',
  'removeAccount',
  'listTransactions',
] as const satisfies readonly (keyof FinbankApi)[]

// Compile-time guard: adding a port method without listing it above fails `tsc`.
type Unlisted = Exclude<keyof FinbankApi, (typeof FINBANK_API_METHODS)[number]>
const portMethodsListed: [Unlisted] extends [never] ? true : Unlisted = true
void portMethodsListed
