import { toIsoDate } from '../../lib/dates.ts'
import type { Account, IsoDate, UserProfile } from '../types.ts'

export const MOCK_STATE_VERSION = 1

/** Everything the mock adapter persists under `finbank:mock:v1`. Later epics add top-level keys. */
export type MockState = {
  version: typeof MOCK_STATE_VERSION
  today: IsoDate
  profile: UserProfile
  /** In display order. May be empty: the user can remove every account. */
  accounts: Account[]
}

/** The single signed-in user of the mock (single-user decision, 2026-11-16). */
export const MOCK_USER_ID = 'usr_1'

export const seed: Readonly<Omit<MockState, 'accounts'>> & {
  readonly accounts: readonly Readonly<Account>[]
} = Object.freeze({
  version: MOCK_STATE_VERSION,
  today: toIsoDate('2023-05-19'),
  profile: Object.freeze({
    fullName: 'Tanzir Rahman',
    email: 'tanzir.rahman@email.com',
    username: 'tanzir.rahman',
    phoneCountryCode: '+880',
    phoneNumber: '51547 58868',
    avatarUrl: null,
  }),
  // Banks, networks and number prefixes follow 105. Balances.png. Balances are chosen so the
  // derived Total Balance is $240,399 (104. Overview.png): 25,056 + 180,000 + 75,343 - 12,000 - 28,000.
  accounts: Object.freeze([
    Object.freeze({
      id: 'acc_1',
      type: 'creditCard',
      bankName: 'AB Bank Ltd.',
      branchName: 'Gulshan Avenue Branch',
      network: 'mastercard',
      accountNumber: '3388455688602598',
      balanceCents: 1_200_000,
    }),
    Object.freeze({
      id: 'acc_2',
      type: 'checking',
      bankName: 'AB Bank Ltd.',
      branchName: 'Park Street Branch',
      network: 'visa',
      accountNumber: '6934566991234',
      balanceCents: 2_505_600,
    }),
    Object.freeze({
      id: 'acc_3',
      type: 'savings',
      bankName: 'Brac Bank Ltd.',
      branchName: 'Banani Branch',
      accountNumber: '13345688681234',
      balanceCents: 18_000_000,
    }),
    Object.freeze({
      id: 'acc_4',
      type: 'investment',
      bankName: 'AB Bank Ltd.',
      branchName: 'Motijheel Branch',
      accountNumber: '69845686624471',
      balanceCents: 7_534_300,
    }),
    Object.freeze({
      id: 'acc_5',
      type: 'loan',
      bankName: 'City Bank Ltd.',
      branchName: 'Dhanmondi Branch',
      accountNumber: '36345689663390',
      balanceCents: 2_800_000,
    }),
  ] satisfies Account[]),
})

/** A deep, mutable copy of the seed. */
export function seedState(): MockState {
  return structuredClone(seed) as MockState
}
