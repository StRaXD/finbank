// The only home of domain types (AD-2). Later epics add their entities here.
export type { IsoDate, YearMonth } from '../lib/dates.ts'

export type ApiErrorCode = 'VALIDATION' | 'STORAGE_FULL' | 'NOT_IMPLEMENTED' | 'UNKNOWN'

/** The only error an adapter throws. UI copy comes from `message`; forms map `fieldErrors` to `setError`. */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly fieldErrors?: Record<string, string>

  constructor(code: ApiErrorCode, message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    if (fieldErrors) this.fieldErrors = fieldErrors
  }
}

/** Identity only (AD-8). Name and avatar come from `UserProfile`. */
export type Session = {
  userId: string
  /** `true` when "Keep me signed in" was checked: the session survives reloads. */
  persistent: boolean
}

export type UserProfile = {
  fullName: string
  email: string
  username: string
  phoneCountryCode: string
  phoneNumber: string
  avatarUrl: string | null
}

export type LoginInput = {
  email: string
  password: string
  persistent: boolean
}

export type SignupInput = {
  name: string
  email: string
  password: string
}
