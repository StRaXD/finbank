import { toIsoDate } from '../../lib/dates.ts'
import type { IsoDate, UserProfile } from '../types.ts'

export const MOCK_STATE_VERSION = 1

/** Everything the mock adapter persists under `finbank:mock:v1`. Later epics add top-level keys. */
export type MockState = {
  version: typeof MOCK_STATE_VERSION
  today: IsoDate
  profile: UserProfile
}

/** The single signed-in user of the mock (single-user decision, 2026-11-16). */
export const MOCK_USER_ID = 'usr_1'

export const seed: Readonly<MockState> = Object.freeze({
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
})

/** A deep, mutable copy of the seed. */
export function seedState(): MockState {
  return structuredClone(seed) as MockState
}
