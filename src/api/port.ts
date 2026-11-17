import type {
  Account,
  BalanceSummary,
  GoogleLoginInput,
  IsoDate,
  LoginInput,
  Session,
  SignupInput,
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
  getBalanceSummary(): Promise<BalanceSummary>
  /** Removes an account and persists it. An unknown id resolves as a no-op (idempotent). */
  removeAccount(id: string): Promise<void>
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
  'getBalanceSummary',
  'removeAccount',
] as const satisfies readonly (keyof FinbankApi)[]

// Compile-time guard: adding a port method without listing it above fails `tsc`.
type Unlisted = Exclude<keyof FinbankApi, (typeof FINBANK_API_METHODS)[number]>
const portMethodsListed: [Unlisted] extends [never] ? true : Unlisted = true
void portMethodsListed
