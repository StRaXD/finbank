import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION_STORAGE_KEY } from '../api/mock/mockApi.ts'
import { ApiError } from '../api/types.ts'
import { routes } from './routes.ts'
import { createTestApi, renderAt, watchDom } from './test-utils.tsx'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

async function openLogin(api = createTestApi()) {
  const view = renderAt(routes.login, api)
  await screen.findByRole('heading', { level: 1, name: 'Log in' })
  return view
}

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Login' }))

describe('Login screen', () => {
  it('renders the design fields with "Keep me signed in" checked', async () => {
    await openLogin()
    expect(screen.getByLabelText('Email Address')).toHaveAttribute('placeholder', 'johndoe@email.com')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Keep me signed in')).toBeChecked()
    expect(screen.getByRole('button', { name: 'Login' })).toHaveAttribute('type', 'submit')
    expect(screen.getByText('or sign in with')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'FINEbank.IO' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    // The design shows only the wordmark, so Login's h1 stays visually hidden.
    expect(screen.getByRole('heading', { level: 1, name: 'Log in' })).toHaveClass('sr-only')
  })

  it('links to Forgot Password and Signup', async () => {
    await openLogin()
    expect(screen.getByRole('link', { name: 'Forgot Password?' })).toHaveAttribute('href', routes.forgotPassword)
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', routes.signup)
  })

  it('keeps the controls in visual order in the DOM (tab order)', async () => {
    await openLogin()
    const order = [
      screen.getByLabelText('Email Address'),
      screen.getByRole('link', { name: 'Forgot Password?' }),
      screen.getByLabelText('Password'),
      screen.getByRole('button', { name: 'Show password' }),
      screen.getByLabelText('Keep me signed in'),
      screen.getByRole('button', { name: 'Login' }),
      screen.getByRole('button', { name: 'Continue with Google' }),
      screen.getByRole('link', { name: 'Create an account' }),
    ]
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('shows both required errors on an empty submit and makes no API call', async () => {
    const api = createTestApi()
    const login = vi.spyOn(api, 'login')
    await openLogin(api)
    submit()
    expect(await screen.findByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
    expect(login).not.toHaveBeenCalled()
  })

  it('shows a format error for an invalid email', async () => {
    const api = createTestApi()
    const login = vi.spyOn(api, 'login')
    await openLogin(api)
    fill('not-an-email', 'secret')
    submit()
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('lands on Overview after a valid login with a persistent session', async () => {
    const api = createTestApi()
    const login = vi.spyOn(api, 'login')
    const { router } = await openLogin(api)
    fill('tanzir@example.com', 'secret')
    // The session is seeded on success, so the form is never swapped for a busy screen on /login.
    const watch = watchDom(
      () => screen.queryByTestId('page-busy') !== null && router.state.location.pathname === routes.login,
    )
    submit()
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
    expect(watch.stop()).toBe(false)
    expect(router.state.location.pathname).toBe(routes.overview)
    expect(login).toHaveBeenCalledWith({ email: 'tanzir@example.com', password: 'secret', persistent: true })
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('stores the session in sessionStorage only when "Keep me signed in" is unchecked', async () => {
    await openLogin()
    fill('tanzir@example.com', 'secret')
    fireEvent.click(screen.getByLabelText('Keep me signed in'))
    submit()
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
    expect(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) ?? 'null')).toMatchObject({ persistent: false })
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('lands on Overview after Continue with Google, persistent by default', async () => {
    const api = createTestApi()
    const google = vi.spyOn(api, 'loginWithGoogle')
    const { router } = await openLogin(api)
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(routes.overview)
    expect(google).toHaveBeenCalledWith({ persistent: true })
    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? 'null')).toMatchObject({ persistent: true })
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('Continue with Google honours an unchecked "Keep me signed in"', async () => {
    await openLogin()
    fireEvent.click(screen.getByLabelText('Keep me signed in'))
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
    expect(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) ?? 'null')).toMatchObject({ persistent: false })
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('disables both buttons while the login is pending', async () => {
    const api = createTestApi({ login: () => new Promise(() => {}) })
    await openLogin(api)
    fill('tanzir@example.com', 'secret')
    submit()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Login' })).toBeDisabled())
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeDisabled()
  })

  it('ignores a double submit and a Google click during a submission', async () => {
    const login = vi.fn(() => new Promise<never>(() => {}))
    const api = createTestApi({ login })
    const google = vi.spyOn(api, 'loginWithGoogle')
    await openLogin(api)
    fill('tanzir@example.com', 'secret')
    submit()
    submit()
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
    await waitFor(() => expect(login).toHaveBeenCalledTimes(1))
    expect(google).not.toHaveBeenCalled()
  })

  it('disables both buttons while Google sign-in is pending', async () => {
    const api = createTestApi({ loginWithGoogle: () => new Promise(() => {}) })
    await openLogin(api)
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeDisabled())
    expect(screen.getByRole('button', { name: 'Login' })).toBeDisabled()
  })

  it('shows a Google failure only as the alert, clearing earlier field errors', async () => {
    const api = createTestApi({
      loginWithGoogle: () =>
        Promise.reject(new ApiError('VALIDATION', 'Google sign-in failed.', { email: 'Should not show.' })),
    })
    await openLogin(api)
    submit()
    expect(await screen.findByText('Email is required.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Google sign-in failed.')
    expect(screen.queryByText('Email is required.')).not.toBeInTheDocument()
    expect(screen.queryByText('Should not show.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).not.toHaveAttribute('aria-invalid')
  })

  it('shows unmapped fieldErrors in the alert and clears it on the next attempt', async () => {
    const login = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiError('VALIDATION', 'Please correct the highlighted fields.', {
          password: 'Wrong password.',
          captcha: 'Captcha expired.',
        }),
      )
      .mockReturnValueOnce(new Promise(() => {}))
    await openLogin(createTestApi({ login }))
    fill('tanzir@example.com', 'secret')
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Captcha expired.')
    expect(screen.getByText('Wrong password.')).toBeInTheDocument()
    submit()
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(screen.queryByText('Wrong password.')).not.toBeInTheDocument()
  })

  it('maps API fieldErrors to the field', async () => {
    const api = createTestApi({
      login: () =>
        Promise.reject(
          new ApiError('VALIDATION', 'Please correct the highlighted fields.', { email: 'No account uses this email.' }),
        ),
    })
    await openLogin(api)
    fill('tanzir@example.com', 'secret')
    submit()
    expect(await screen.findByText('No account uses this email.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows any other API error above the Login button', async () => {
    const api = createTestApi({
      login: () => Promise.reject(new ApiError('STORAGE_FULL', 'Your browser storage is full.')),
    })
    await openLogin(api)
    fill('tanzir@example.com', 'secret')
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Your browser storage is full.')
    expect(screen.getByRole('button', { name: 'Login' })).toBeEnabled()
  })
})
