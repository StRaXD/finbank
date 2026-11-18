import { describe, expect, it, vi } from 'vitest'
import type { ApiError } from '../api/types.ts'
import { GENERIC_SAVE_ERROR_MESSAGE, mapApiFieldErrors } from './mapApiFieldErrors.ts'

type Input = { name: string; amount: string }

// An `ApiError`-shaped value (ui may import api/types only as types).
const apiError = (message: string, fieldErrors?: Record<string, string>) =>
  Object.assign(new Error(message), { name: 'ApiError', code: 'VALIDATION', ...(fieldErrors && { fieldErrors }) }) as ApiError

const fieldByApiField = { nameField: 'name', amountCents: 'amount' } as const

describe('mapApiFieldErrors', () => {
  it('puts each mapped field error on its input, and nothing on root', () => {
    const setError = vi.fn()
    mapApiFieldErrors<Input>(
      apiError('Fix it.', { nameField: 'Enter a name.', amountCents: ' Too big. ' }),
      fieldByApiField,
      setError,
    )
    expect(setError).toHaveBeenCalledTimes(2)
    expect(setError).toHaveBeenCalledWith('name', { message: 'Enter a name.' }, { shouldFocus: false })
    expect(setError).toHaveBeenCalledWith('amount', { message: 'Too big.' }, { shouldFocus: false })
  })

  it('focuses only the first mapped field when asked', () => {
    const setError = vi.fn()
    mapApiFieldErrors<Input>(
      apiError('Fix it.', { nameField: 'Enter a name.', amountCents: 'Too big.' }),
      fieldByApiField,
      setError,
      { focusFirst: true },
    )
    expect(setError).toHaveBeenNthCalledWith(1, 'name', { message: 'Enter a name.' }, { shouldFocus: true })
    expect(setError).toHaveBeenNthCalledWith(2, 'amount', { message: 'Too big.' }, { shouldFocus: false })
  })

  it('joins unmapped field errors into one root.server message', () => {
    const setError = vi.fn()
    mapApiFieldErrors<Input>(
      apiError('Fix it.', { nameField: 'Enter a name.', other: 'Bad.', more: 'Worse.', blank: '  ' }),
      fieldByApiField,
      setError,
    )
    expect(setError).toHaveBeenCalledWith('name', { message: 'Enter a name.' }, { shouldFocus: false })
    expect(setError).toHaveBeenCalledWith('root.server', { message: 'Bad. Worse.' })
  })

  it("shows the error's own message when no field error applies", () => {
    const setError = vi.fn()
    mapApiFieldErrors<Input>(apiError(' Storage is full. '), fieldByApiField, setError)
    expect(setError).toHaveBeenCalledExactlyOnceWith('root.server', { message: 'Storage is full.' })
  })

  it('reads fieldErrors structurally, ignoring prototype keys', () => {
    const setError = vi.fn()
    const error = Object.assign(new Error('x'), { fieldErrors: { amountCents: 'Too big.', toString: 'no' } })
    mapApiFieldErrors<Input>(error, fieldByApiField, setError)
    expect(setError).toHaveBeenCalledWith('amount', { message: 'Too big.' }, { shouldFocus: false })
    expect(setError).toHaveBeenCalledWith('root.server', { message: 'no' })
  })

  it.each([
    ['an Error without a message', new Error('  ')],
    ['a non-Error value', 'boom'],
    ['null', null],
    ['an array fieldErrors', Object.assign(new Error(''), { fieldErrors: ['x'] })],
  ])('falls back to the generic message for %s', (_name, error) => {
    const setError = vi.fn()
    mapApiFieldErrors<Input>(error, fieldByApiField, setError)
    expect(setError).toHaveBeenCalledExactlyOnceWith('root.server', { message: GENERIC_SAVE_ERROR_MESSAGE })
  })
})
