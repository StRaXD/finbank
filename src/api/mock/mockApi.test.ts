import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../types.ts'
import {
  createMemoryStorage,
  createMockApi,
  MOCK_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  type MockApiOptions,
  type StorageLike,
} from './mockApi.ts'
import { seed } from './seed.ts'

const stores = () => ({ local: localStorage, session: sessionStorage })
const make = (options: MockApiOptions = {}) =>
  createMockApi({ storage: localStorage, sessionStores: stores(), delayMs: 0, ...options })

const stored = () => JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY) ?? 'null')

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => {
      throw new Error('expected a rejection')
    },
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(ApiError)
  return error as ApiError
}

const throwingStorage = (error: unknown = new DOMException('quota', 'QuotaExceededError')): StorageLike => ({
  getItem: () => null,
  setItem: () => {
    throw error
  },
  removeItem: () => {},
})

const seedJson = () => ({ version: 1, today: '2023-05-19', profile: seed.profile })

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('seed', () => {
  it('serves mock today and the single seeded user', async () => {
    const api = make()
    await expect(api.getToday()).resolves.toBe('2023-05-19')
    await expect(api.getProfile()).resolves.toEqual({
      fullName: 'Tanzir Rahman',
      email: 'tanzir.rahman@email.com',
      username: 'tanzir.rahman',
      phoneCountryCode: '+880',
      phoneNumber: '51547 58868',
      avatarUrl: null,
    })
  })

  it('writes the seed through to storage as version 1 on first use', async () => {
    await make().getToday()
    expect(stored()).toEqual({ version: 1, today: '2023-05-19', profile: seed.profile })
  })

  it('hands out copies, so callers cannot mutate adapter state', async () => {
    const api = make()
    const profile = await api.getProfile()
    profile.fullName = 'Changed'
    await expect(api.getProfile()).resolves.toMatchObject({ fullName: 'Tanzir Rahman' })
  })
})

describe('persistence', () => {
  it('round-trips state through storage into a new adapter', async () => {
    const custom = {
      version: 1,
      today: '2024-02-29',
      profile: { ...seed.profile, fullName: 'Someone Else' },
    }
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(custom))
    const api = make()
    await expect(api.getToday()).resolves.toBe('2024-02-29')
    await expect(api.getProfile()).resolves.toMatchObject({ fullName: 'Someone Else' })
    expect(stored()).toEqual(custom)
  })

  it.each([
    ['missing', null],
    ['unparseable', '{not json'],
    ['the wrong version', JSON.stringify({ version: 2, today: '2024-01-01' })],
    ['not an object', JSON.stringify([1, 2, 3])],
    ['null', 'null'],
  ])('falls back to the seed when the entry is %s', async (_name, raw) => {
    if (raw !== null) localStorage.setItem(MOCK_STORAGE_KEY, raw)
    const api = make()
    await expect(api.getToday()).resolves.toBe('2023-05-19')
    expect(stored()).toEqual({ version: 1, today: '2023-05-19', profile: seed.profile })
  })

  it('backfills missing top-level keys from the seed and keeps the rest', async () => {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({ version: 1, today: '2024-03-01' }))
    const api = make()
    await expect(api.getToday()).resolves.toBe('2024-03-01')
    await expect(api.getProfile()).resolves.toEqual(seed.profile)
    expect(stored()).toEqual({ version: 1, today: '2024-03-01', profile: seed.profile })
  })

  it.each([
    ['today is a number', { today: 123 }, { today: '2023-05-19' }],
    ['today is not a real date', { today: '2023-02-30' }, { today: '2023-05-19' }],
    ['today is null', { today: null }, { today: '2023-05-19' }],
    ['profile is null', { profile: null }, { profile: seed.profile }],
    ['profile is a string', { profile: 'x' }, { profile: seed.profile }],
    ['profile is an array', { profile: [1] }, { profile: seed.profile }],
    ['profile is empty', { profile: {} }, { profile: seed.profile }],
    [
      'profile fields are partly mistyped',
      { profile: { fullName: 'Jane', email: 42, avatarUrl: 7, phoneNumber: null } },
      { profile: { ...seed.profile, fullName: 'Jane' } },
    ],
    [
      'profile has a string avatar',
      { profile: { ...seed.profile, avatarUrl: 'data:image/jpeg;base64,AA' } },
      { profile: { ...seed.profile, avatarUrl: 'data:image/jpeg;base64,AA' } },
    ],
  ])('repairs a v1 entry where %s', async (_name, patch, expected) => {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({ ...seedJson(), ...patch }))
    const api = make()
    const want = { ...seedJson(), ...expected }
    await expect(api.getToday()).resolves.toBe(want.today)
    await expect(api.getProfile()).resolves.toEqual(want.profile)
    expect(stored()).toEqual(want)
  })

  it('keeps serving reads from memory when the first write-back hits a full store', async () => {
    const api = make({ storage: throwingStorage() })
    await expect(api.getToday()).resolves.toBe('2023-05-19')
    await expect(api.getProfile()).resolves.toEqual(seed.profile)
    await expect(api.getToday()).resolves.toBe('2023-05-19')
  })

  it('keeps serving reads when the write-back fails for another reason', async () => {
    const api = make({ storage: throwingStorage(new Error('disk')) })
    await expect(api.getToday()).resolves.toBe('2023-05-19')
  })
})

describe('default stores', () => {
  function blockStorage(name: 'localStorage' | 'sessionStorage') {
    const original = Object.getOwnPropertyDescriptor(globalThis, name)
    Object.defineProperty(globalThis, name, {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError')
      },
    })
    return () => {
      if (original) Object.defineProperty(globalThis, name, original)
      else Reflect.deleteProperty(globalThis, name)
    }
  }

  it('falls back to in-memory stores when browser storage throws on access', async () => {
    const restoreLocal = blockStorage('localStorage')
    const restoreSession = blockStorage('sessionStorage')
    try {
      const api = createMockApi({ delayMs: 0 })
      await expect(api.getToday()).resolves.toBe('2023-05-19')
      await api.login({ email: 'a@b.co', password: 'pw', persistent: false })
      await expect(api.getSession()).resolves.toEqual({ userId: 'usr_1', persistent: false })
      await api.logout()
      await expect(api.getSession()).resolves.toBeNull()
    } finally {
      restoreLocal()
      restoreSession()
    }
  })

  it('createMemoryStorage round-trips items', () => {
    const store = createMemoryStorage()
    expect(store.getItem('k')).toBeNull()
    store.setItem('k', 'v')
    expect(store.getItem('k')).toBe('v')
    store.removeItem('k')
    expect(store.getItem('k')).toBeNull()
  })
})

describe('session', () => {
  const credentials = { email: 'a@b.co', password: 'secret' }

  it('stores a persistent login in localStorage only', async () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'old', persistent: false }))
    const session = await make().login({ ...credentials, persistent: true })
    expect(session).toEqual({ userId: 'usr_1', persistent: true })
    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)!)).toEqual(session)
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()

    // A reload: a new adapter over the same stores finds it in localStorage.
    await expect(make().getSession()).resolves.toEqual(session)
  })

  it('stores a non-persistent login in sessionStorage only', async () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'old', persistent: true }))
    const session = await make().login({ ...credentials, persistent: false })
    expect(session).toEqual({ userId: 'usr_1', persistent: false })
    expect(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)).toEqual(session)
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()

    await expect(make().getSession()).resolves.toEqual(session)
  })

  it.each([
    ['loginWithGoogle', () => make().loginWithGoogle({ persistent: true })],
    ['signup', () => make().signup({ name: 'Jane', ...credentials })],
  ])('%s creates a persistent session for usr_1', async (_name, run) => {
    await expect(run()).resolves.toEqual({ userId: 'usr_1', persistent: true })
    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)!)).toEqual({
      userId: 'usr_1',
      persistent: true,
    })
  })

  it('stores a non-persistent Google login in sessionStorage only', async () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'old', persistent: true }))
    const session = await make().loginWithGoogle({ persistent: false })
    expect(session).toEqual({ userId: 'usr_1', persistent: false })
    expect(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)).toEqual(session)
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()

    await expect(make().getSession()).resolves.toEqual(session)
  })

  it('discards the signup name and email: the profile stays the seeded user', async () => {
    const api = make()
    await api.signup({ name: 'Jane Doe', email: 'jane@doe.com', password: 'pw' })
    await expect(api.getProfile()).resolves.toEqual(seed.profile)
  })

  it('logout clears both stores', async () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'usr_1', persistent: true }))
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'usr_1', persistent: false }))
    const api = make()
    await api.logout()
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    await expect(api.getSession()).resolves.toBeNull()
  })

  it('returns null with no session', async () => {
    await expect(make().getSession()).resolves.toBeNull()
  })

  it('reads localStorage before sessionStorage', async () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'usr_1', persistent: true }))
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'usr_1', persistent: false }))
    await expect(make().getSession()).resolves.toEqual({ userId: 'usr_1', persistent: true })
  })

  it('a corrupt localStorage entry does not mask a valid sessionStorage session', async () => {
    localStorage.setItem(SESSION_STORAGE_KEY, '{oops')
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'usr_1', persistent: false }))
    await expect(make().getSession()).resolves.toEqual({ userId: 'usr_1', persistent: false })
  })

  it.each([
    '{oops',
    '"usr_1"',
    'null',
    JSON.stringify({ userId: 'usr_1' }),
    JSON.stringify({ userId: 1, persistent: true }),
    JSON.stringify({ userId: 'usr_2', persistent: true }),
  ])(
    'returns null for corrupt session data %s',
    async (raw) => {
      localStorage.setItem(SESSION_STORAGE_KEY, raw)
      await expect(make().getSession()).resolves.toBeNull()
      localStorage.clear()
      sessionStorage.setItem(SESSION_STORAGE_KEY, raw)
      await expect(make().getSession()).resolves.toBeNull()
    },
  )

  it.each([
    ['a quota name', new DOMException('quota', 'QuotaExceededError')],
    ['Firefox quota name', { name: 'NS_ERROR_DOM_QUOTA_REACHED' }],
    ['legacy code 22', { name: 'Error', code: 22 }],
    ['legacy code 1014', { name: 'Error', code: 1014 }],
  ])('fails the session write with STORAGE_FULL for %s', async (_name, thrown) => {
    const api = make({ sessionStores: { local: throwingStorage(thrown), session: sessionStorage } })
    const error = await rejection(api.login({ ...credentials, persistent: true }))
    expect(error.code).toBe('STORAGE_FULL')
  })

  it('fails the session write with UNKNOWN for a non-quota storage error', async () => {
    const api = make({
      sessionStores: { local: localStorage, session: throwingStorage(new DOMException('no', 'SecurityError')) },
    })
    const error = await rejection(api.login({ ...credentials, persistent: false }))
    expect(error.code).toBe('UNKNOWN')
  })
})

describe('validation', () => {
  it.each([
    ['malformed email', { email: 'nope', password: 'pw', persistent: true }, ['email']],
    ['empty email', { email: '  ', password: 'pw', persistent: true }, ['email']],
    ['empty password', { email: 'a@b.co', password: '', persistent: true }, ['password']],
    ['both', { email: 'a@', password: '', persistent: false }, ['email', 'password']],
  ])('login rejects %s with VALIDATION field errors', async (_name, input, fields) => {
    const error = await rejection(make().login(input))
    expect(error.code).toBe('VALIDATION')
    expect(Object.keys(error.fieldErrors ?? {}).sort()).toEqual(fields)
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('signup requires name, a well-formed email and a password', async () => {
    const error = await rejection(make().signup({ name: ' ', email: 'x@y', password: '' }))
    expect(error.code).toBe('VALIDATION')
    expect(error.fieldErrors).toEqual({
      name: expect.any(String),
      email: expect.any(String),
      password: expect.any(String),
    })
  })

  it('requestPasswordReset validates the email and resolves for a well-formed one', async () => {
    const error = await rejection(make().requestPasswordReset('bad'))
    expect(error.code).toBe('VALIDATION')
    expect(error.fieldErrors).toHaveProperty('email')
    await expect(make().requestPasswordReset('a@b.co')).resolves.toBeUndefined()
  })

  it('wraps unexpected failures in ApiError', async () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
    const api = make({
      sessionStores: {
        local: { ...storage, getItem: () => { throw new Error('boom') } },
        session: storage,
      },
    })
    const error = await rejection(api.getSession())
    expect(error.code).toBe('UNKNOWN')
  })
})

describe('delay', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('awaits delayMs (200 by default) before every response', async () => {
    vi.useFakeTimers()
    const api = createMockApi({ storage: localStorage, sessionStores: stores() })
    const onDone = vi.fn()
    void api.getToday().then(onDone)
    await vi.advanceTimersByTimeAsync(199)
    expect(onDone).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(onDone).toHaveBeenCalledWith('2023-05-19')
  })

  it('honours a custom delay on every method', async () => {
    vi.useFakeTimers()
    const api = make({ delayMs: 50 })
    const onDone = vi.fn()
    void api.logout().then(onDone)
    await vi.advanceTimersByTimeAsync(49)
    expect(onDone).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(onDone).toHaveBeenCalled()
  })
})
