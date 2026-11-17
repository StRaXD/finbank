import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/types.ts'
import { alertMessage, applyApiError, genericErrorMessage } from './applyApiError.ts'

type Values = { email: string; password: string }
const fields = ['email', 'password'] as const

function run(error: ApiError) {
  const setError = vi.fn()
  applyApiError<Values>(error, fields, setError)
  return setError.mock.calls.map(([name, { message }]) => [name, message])
}

describe('applyApiError', () => {
  it('sends mapped field errors to their inputs and nothing to the alert', () => {
    expect(run(new ApiError('VALIDATION', 'Fix the fields.', { email: 'Bad email.', password: 'Bad password.' }))).toEqual([
      ['email', 'Bad email.'],
      ['password', 'Bad password.'],
    ])
  })

  it('sends unmapped field errors to the alert', () => {
    expect(run(new ApiError('VALIDATION', 'Fix the fields.', { captcha: 'Captcha expired.', foo: 'Foo.' }))).toEqual([
      ['root.server', 'Captcha expired. Foo.'],
    ])
  })

  it('splits a mix of mapped and unmapped field errors', () => {
    expect(run(new ApiError('VALIDATION', 'Fix the fields.', { email: 'Bad email.', captcha: 'Captcha expired.' }))).toEqual([
      ['email', 'Bad email.'],
      ['root.server', 'Captcha expired.'],
    ])
  })

  it('skips empty field messages and falls back to the error message', () => {
    expect(run(new ApiError('VALIDATION', 'Fix the fields.', { email: '', foo: '  ' }))).toEqual([
      ['root.server', 'Fix the fields.'],
    ])
  })

  it('falls back to a generic alert when every message is empty', () => {
    expect(run(new ApiError('VALIDATION', '', { email: '' }))).toEqual([['root.server', genericErrorMessage]])
  })

  it('shows the error message when there are no fieldErrors', () => {
    expect(run(new ApiError('STORAGE_FULL', 'Storage is full.'))).toEqual([['root.server', 'Storage is full.']])
  })

  it('alertMessage falls back to the generic message for a blank message', () => {
    expect(alertMessage(new ApiError('UNKNOWN', '   '))).toBe(genericErrorMessage)
    expect(alertMessage(new ApiError('UNKNOWN', 'Boom.'))).toBe('Boom.')
  })
})
