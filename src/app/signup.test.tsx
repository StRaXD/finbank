import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/types.ts'
import { routes } from './routes.ts'
import { createTestApi, renderAt, watchDom } from './test-utils.tsx'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

async function openSignup(api = createTestApi()) {
  const view = renderAt(routes.signup, api)
  await screen.findByRole('heading', { level: 1, name: 'Create an account' })
  return view
}

function fill(name: string, email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))

describe('Signup screen', () => {
  it('renders the design fields with one visible h1', async () => {
    await openSignup()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveClass('sr-only')
    expect(screen.getByLabelText('Name')).toHaveAttribute('placeholder', 'Tanzir Rahman')
    expect(screen.getByLabelText('Email Address')).toHaveAttribute('placeholder', 'hello@example.com')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Sign up' })).toHaveAttribute('type', 'submit')
    expect(screen.getByText('or sign up with')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'FINEbank.IO' })).toBeInTheDocument()
  })

  it('keeps the controls in visual order in the DOM (tab order)', async () => {
    await openSignup()
    const order = [
      screen.getByLabelText('Name'),
      screen.getByLabelText('Email Address'),
      screen.getByLabelText('Password'),
      screen.getByRole('button', { name: 'Show password' }),
      screen.getByRole('button', { name: 'terms of service.' }),
      screen.getByRole('button', { name: 'Sign up' }),
      screen.getByRole('button', { name: 'Continue with Google' }),
      screen.getByRole('link', { name: 'Sign in here' }),
    ]
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('shows all three required errors on an empty submit and makes no API call', async () => {
    const api = createTestApi()
    const signup = vi.spyOn(api, 'signup')
    await openSignup(api)
    submit()
    expect(await screen.findByText('Name is required.')).toBeInTheDocument()
    expect(screen.getByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
    expect(signup).not.toHaveBeenCalled()
  })

  it('treats a whitespace-only name as missing', async () => {
    const api = createTestApi()
    const signup = vi.spyOn(api, 'signup')
    await openSignup(api)
    fill('   ', 'tanzir@example.com', 'secret')
    submit()
    expect(await screen.findByText('Name is required.')).toBeInTheDocument()
    expect(signup).not.toHaveBeenCalled()
  })

  it('shows a format error for an invalid email', async () => {
    const api = createTestApi()
    const signup = vi.spyOn(api, 'signup')
    await openSignup(api)
    fill('Tanzir Rahman', 'not-an-email', 'secret')
    submit()
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(signup).not.toHaveBeenCalled()
  })

  it('lands on Overview after a valid signup without a busy flash', async () => {
    const api = createTestApi()
    const signup = vi.spyOn(api, 'signup')
    const { router } = await openSignup(api)
    fill('Tanzir Rahman', 'tanzir@example.com', 'secret')
    const watch = watchDom(
      () => screen.queryByTestId('page-busy') !== null && router.state.location.pathname === routes.signup,
    )
    submit()
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
    expect(watch.stop()).toBe(false)
    expect(router.state.location.pathname).toBe(routes.overview)
    expect(signup).toHaveBeenCalledWith({ name: 'Tanzir Rahman', email: 'tanzir@example.com', password: 'secret' })
  })

  it('lands on Overview after Continue with Google, with a persistent session', async () => {
    const api = createTestApi()
    const google = vi.spyOn(api, 'loginWithGoogle')
    const { router } = await openSignup(api)
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(routes.overview)
    expect(google).toHaveBeenCalledWith({ persistent: true })
  })

  it('maps an API fieldErrors.name to the Name field', async () => {
    const api = createTestApi({
      signup: () =>
        Promise.reject(new ApiError('VALIDATION', 'Please correct the highlighted fields.', { name: 'Name is too long.' })),
    })
    await openSignup(api)
    fill('Tanzir Rahman', 'tanzir@example.com', 'secret')
    submit()
    expect(await screen.findByText('Name is too long.')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each([
    ['email', 'Email Address', 'This email is already in use.'],
    ['password', 'Password', 'Password is too weak.'],
  ])('maps an API fieldErrors.%s to its input', async (key, label, message) => {
    const api = createTestApi({
      signup: () =>
        Promise.reject(new ApiError('VALIDATION', 'Please correct the highlighted fields.', { [key]: message })),
    })
    await openSignup(api)
    fill('Tanzir Rahman', 'tanzir@example.com', 'secret')
    submit()
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('sends an unknown fieldErrors key to the alert', async () => {
    const api = createTestApi({
      signup: () => Promise.reject(new ApiError('VALIDATION', 'Please correct the highlighted fields.', { foo: 'Foo is wrong.' })),
    })
    await openSignup(api)
    fill('Tanzir Rahman', 'tanzir@example.com', 'secret')
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Foo is wrong.')
    for (const label of ['Name', 'Email Address', 'Password']) {
      expect(screen.getByLabelText(label)).not.toHaveAttribute('aria-invalid')
    }
  })

  it('shows a generic alert when Google fails with an empty message', async () => {
    await openSignup(createTestApi({ loginWithGoogle: () => Promise.reject(new ApiError('UNKNOWN', '')) }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
  })

  it('sends a trimmed name and email', async () => {
    const api = createTestApi()
    const signup = vi.spyOn(api, 'signup')
    await openSignup(api)
    fill('  Tanzir  ', '  user@example.com  ', 'secret')
    submit()
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
    expect(signup).toHaveBeenCalledWith({ name: 'Tanzir', email: 'user@example.com', password: 'secret' })
  })

  it('never changes the mock profile (single-user)', async () => {
    const api = createTestApi()
    await openSignup(api)
    fill('Someone Else', 'someone@example.com', 'secret')
    submit()
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
    const profile = await api.getProfile()
    expect(profile.fullName).toBe('Tanzir Rahman')
    expect(profile.email).not.toBe('someone@example.com')
  })

  it('shows any other API error in the alert', async () => {
    const api = createTestApi({
      signup: () => Promise.reject(new ApiError('STORAGE_FULL', 'Your browser storage is full.')),
    })
    await openSignup(api)
    fill('Tanzir Rahman', 'tanzir@example.com', 'secret')
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Your browser storage is full.')
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeEnabled()
  })

  it('shows a Google failure only as the alert, clearing earlier field errors', async () => {
    const api = createTestApi({
      loginWithGoogle: () =>
        Promise.reject(new ApiError('VALIDATION', 'Google sign-in failed.', { name: 'Should not show.' })),
    })
    await openSignup(api)
    submit()
    expect(await screen.findByText('Name is required.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Google sign-in failed.')
    expect(screen.queryByText('Name is required.')).not.toBeInTheDocument()
    expect(screen.queryByText('Should not show.')).not.toBeInTheDocument()
  })

  it('disables both buttons while the signup is pending and ignores a double submit', async () => {
    const signup = vi.fn(() => new Promise<never>(() => {}))
    const api = createTestApi({ signup })
    const google = vi.spyOn(api, 'loginWithGoogle')
    await openSignup(api)
    fill('Tanzir Rahman', 'tanzir@example.com', 'secret')
    submit()
    submit()
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign up' })).toBeDisabled())
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeDisabled()
    expect(signup).toHaveBeenCalledTimes(1)
    expect(google).not.toHaveBeenCalled()
  })

  it('disables both buttons while Google sign-in is pending', async () => {
    const api = createTestApi({ loginWithGoogle: () => new Promise(() => {}) })
    await openSignup(api)
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeDisabled())
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeDisabled()
  })

  it('keeps "terms of service." inert', async () => {
    const api = createTestApi()
    const signup = vi.spyOn(api, 'signup')
    const { router } = await openSignup(api)
    const terms = screen.getByRole('button', { name: 'terms of service.' })
    expect(terms).toHaveAttribute('type', 'button')
    expect(terms).toHaveAttribute('aria-disabled', 'true')
    expect(terms).not.toBeDisabled()
    terms.focus()
    expect(terms).toHaveFocus()
    // Enter on a focused button fires keydown and then a click; neither may do anything.
    fireEvent.keyDown(terms, { key: 'Enter', code: 'Enter' })
    fireEvent.click(terms)
    expect(router.state.location.pathname).toBe(routes.signup)
    expect(screen.queryByText('Name is required.')).not.toBeInTheDocument()
    expect(signup).not.toHaveBeenCalled()
  })

  it('goes to Login from "Sign in here"', async () => {
    const { router } = await openSignup()
    const link = screen.getByRole('link', { name: 'Sign in here' })
    expect(link).toHaveAttribute('href', routes.login)
    fireEvent.click(link)
    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(routes.login)
  })
})
