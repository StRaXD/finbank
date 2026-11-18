import type {
  Account,
  BalanceSummary,
  Bill,
  CategoryLimit,
  CategorySummary,
  ComparisonGranularity,
  ComparisonPoint,
  ExpenseCategoryId,
  GoogleLoginInput,
  IsoDate,
  ListBillsInput,
  ListTransactionsInput,
  LoginInput,
  PasswordInput,
  ProfileInput,
  SavingSummaryPoint,
  SavingsGoal,
  SavingsGoalAmounts,
  Session,
  SignupInput,
  TransactionPage,
  UserProfile,
  YearMonth,
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
  /**
   * Stores the trimmed profile fields, persists them and resolves with a copy of the profile.
   * Every field is required and `email` must be well formed, otherwise it rejects with
   * `VALIDATION` and `fieldErrors` keyed by field (the avatar is not checked then). Without
   * `avatar`, `avatarUrl` is kept. With `avatar`, the image must be JPEG, PNG, WebP or GIF and at
   * most 5 MB; it is downscaled to a JPEG data URL of at most 256px on its longer side (never
   * upscaled) and stored as `avatarUrl`. A wrong type, an oversized image or one that cannot be
   * decoded rejects with `VALIDATION` and `fieldErrors.avatar`. It never touches the session. A
   * failed write rejects with `STORAGE_FULL` when storage is full (`UNKNOWN` for any other write
   * failure). Every rejection leaves the stored profile, avatar included, unchanged.
   */
  updateProfile(input: ProfileInput): Promise<UserProfile>
  /**
   * Changes the signed-in user's password. `oldPassword` is required, `newPassword` is required
   * and at least `PASSWORD_MIN_LENGTH` characters, and `confirmPassword` is required and equal to
   * `newPassword`; passwords are never trimmed. A failed rule rejects with `VALIDATION` and
   * `fieldErrors` keyed `oldPassword` / `newPassword` / `confirmPassword`, whose messages never
   * contain a password. The mock does not check `oldPassword` against a stored credential (mock
   * sign-in stores none) and stores no password; it resolves once the rules pass. It never touches
   * the session or the profile.
   */
  changePassword(input: PasswordInput): Promise<void>
  /** Every account, in stored (seed) order. */
  listAccounts(): Promise<Account[]>
  /** One account (a copy), or `null` for an unknown id. */
  getAccount(id: string): Promise<Account | null>
  /**
   * Assets minus liabilities over every account. `totalBalanceCents` is signed: negative when
   * liabilities exceed assets.
   */
  getBalanceSummary(): Promise<BalanceSummary>
  /** Removes an account and persists it. An unknown id resolves as a no-op (idempotent). */
  removeAccount(id: string): Promise<void>
  /**
   * One page of transactions, newest first (equal dates keep stored order), optionally filtered
   * by kind and account. A bad `limit` or cursor rejects with `VALIDATION`.
   */
  listTransactions(input: ListTransactionsInput): Promise<TransactionPage>
  /**
   * Upcoming bills (copies), earliest due date first (equal dates keep stored order), truncated
   * to `limit` when given. A bad `limit` rejects with `VALIDATION`.
   */
  listBills(input?: ListBillsInput): Promise<Bill[]>
  /**
   * Six summaries, fixed order, month containing today: Housing, Food, Transportation,
   * Entertainment, Shopping, Others. Each has the month's total, its signed % change against the
   * previous month and its two most recent items. Untagged expenses are left out.
   */
  listCategorySummaries(): Promise<CategorySummary[]>
  /**
   * The expense comparison series, from the same expenses as `listCategorySummaries`.
   * `'year'`: 12 points, Jan–Dec of today's year against the year before. `'week'`: 7 points,
   * Sun–Sat of the week containing today against the week before. `currentCents` is `null` after
   * today. An unknown granularity rejects with `VALIDATION`.
   */
  getComparison(granularity: ComparisonGranularity): Promise<ComparisonPoint[]>
  /**
   * The savings goal of `month` (a copy). A month with no stored goal resolves as a zero goal
   * (`targetCents` and `achievedCents` 0), not an error. A malformed month rejects with `VALIDATION`.
   */
  getSavingsGoal(month: YearMonth): Promise<SavingsGoal>
  /**
   * Stores `month`'s savings goal (creating it for a month that had none), persists it and resolves
   * with a copy. Both amounts must be non-negative safe integer cents; `achievedCents` may exceed
   * the target. Bad amounts reject with `VALIDATION` and `fieldErrors` keyed `targetCents` /
   * `achievedCents`; a malformed month rejects with `VALIDATION`. A failed write rejects with
   * `STORAGE_FULL` when storage is full (`UNKNOWN` for any other write failure) and leaves the
   * stored goals unchanged.
   */
  updateSavingsGoal(month: YearMonth, amounts: SavingsGoalAmounts): Promise<SavingsGoal>
  /**
   * The Saving Summary series of `month`, one point per day of that month, derived from the stored
   * savings goals. `currentCents` splits `month`'s `achievedCents` over days 1 to min(today, month
   * end) and is `null` after today; over those days it sums exactly to `achievedCents`.
   * `previousCents` is the previous month's `achievedCents` split over all of its days, but shown
   * only on the days `month` has (`null` on a day the previous month lacks), so when the previous
   * month is longer it sums to less than its `achievedCents`. A month with no stored goal gives
   * zeros. A malformed month rejects with `VALIDATION`.
   */
  getSavingSummary(month: YearMonth): Promise<SavingSummaryPoint[]>
  /**
   * The six category spending limits (copies), always in the fixed category order Housing, Food,
   * Transportation, Entertainment, Shopping, Others.
   */
  listCategoryLimits(): Promise<CategoryLimit[]>
  /**
   * Stores `category`'s limit, persists it and resolves with a copy. Only that category changes.
   * An unknown category rejects with `VALIDATION`; `limitCents` must be non-negative safe integer
   * cents, otherwise it rejects with `VALIDATION` and `fieldErrors.limitCents`. A failed write
   * rejects with `STORAGE_FULL` when storage is full (`UNKNOWN` for any other write failure) and
   * leaves the stored limits unchanged.
   */
  updateCategoryLimit(category: ExpenseCategoryId, limitCents: number): Promise<CategoryLimit>
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
  'updateProfile',
  'changePassword',
  'listAccounts',
  'getAccount',
  'getBalanceSummary',
  'removeAccount',
  'listTransactions',
  'listBills',
  'listCategorySummaries',
  'getComparison',
  'getSavingsGoal',
  'updateSavingsGoal',
  'getSavingSummary',
  'listCategoryLimits',
  'updateCategoryLimit',
] as const satisfies readonly (keyof FinbankApi)[]

// Compile-time guard: adding a port method without listing it above fails `tsc`.
type Unlisted = Exclude<keyof FinbankApi, (typeof FINBANK_API_METHODS)[number]>
const portMethodsListed: [Unlisted] extends [never] ? true : Unlisted = true
void portMethodsListed
