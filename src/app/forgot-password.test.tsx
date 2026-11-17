import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/types.ts'
import { routes } from './routes.ts'
import { createTestApi, renderAt } from './test-utils.tsx'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

const confirmation = 'Check your email for a password reset link.'

async function openForgot(api = createTestApi()) {
  const view = renderAt(routes.forgotPassword, api)
  await screen.findByRole('heading', { level: 1, name: 'Forgot Password?' })
  return view
}

const fill = (email: string) => fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: email } })
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Password Reset' }))

describe('Forgot Password screen', () => {
  it('renders the heading, subtext, field and an empty status region', async () => {
    await openForgot()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByText('Enter your email address to get the password reset link.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toHaveAttribute('placeholder', 'hello@example.com')
    expect(screen.getByRole('button', { name: 'Password Reset' })).toHaveAttribute('type', 'submit')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('keeps the controls in visual order in the DOM (tab order)', async () => {
    await openForgot()
    const order = [
      screen.getByLabelText('Email Address'),
      screen.getByRole('button', { name: 'Password Reset' }),
      screen.getByRole('link', { name: 'Back to login' }),
    ]
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('shows a required error on an empty submit and makes no API call', async () => {
    const api = createTestApi()
    const request = vi.spyOn(api, 'requestPasswordReset')
    await openForgot(api)
    submit()
    expect(await screen.findByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toHaveAttribute('aria-invalid', 'true')
    expect(request).not.toHaveBeenCalled()
  })

  it('shows a format error for an invalid email and makes no API call', async () => {
    const api = createTestApi()
    const request = vi.spyOn(api, 'requestPasswordReset')
    await openForgot(api)
    fill('not-an-email')
    submit()
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(request).not.toHaveBeenCalled()
  })

  it('requests the reset and shows the confirmation, keeping the form in place', async () => {
    const api = createTestApi()
    const request = vi.spyOn(api, 'requestPasswordReset')
    const { router } = await openForgot(api)
    fill('tanzir@example.com')
    submit()
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(confirmation))
    expect(request).toHaveBeenCalledWith('tanzir@example.com')
    expect(router.state.location.pathname).toBe(routes.forgotPassword)
    expect(screen.getByLabelText('Email Address')).toHaveValue('tanzir@example.com')
    expect(screen.getByRole('button', { name: 'Password Reset' })).toBeEnabled()
  })

  it('clears the confirmation when the email is edited after success', async () => {
    await openForgot()
    fill('tanzir@example.com')
    submit()
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(confirmation))
    fill('other@example.com')
    // Mutation state changes reach React through a batched notify, so wait for it.
    await waitFor(() => expect(screen.getByRole('status')).toBeEmptyDOMElement())
  })

  it('never shows the confirmation for a request that settles after the email was edited', async () => {
    let resolveRequest: (() => void) | undefined
    const request = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRequest = resolve
        }),
    )
    await openForgot(createTestApi({ requestPasswordReset: request }))
    fill('tanzir@example.com')
    submit()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Password Reset' })).toBeDisabled())
    fill('other@example.com')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Password Reset' })).toBeEnabled())
    await act(async () => resolveRequest?.())
    expect(request).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('sends a pasted email trimmed', async () => {
    const api = createTestApi()
    const request = vi.spyOn(api, 'requestPasswordReset')
    await openForgot(api)
    fill('  user@example.com  ')
    submit()
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(confirmation))
    expect(request).toHaveBeenCalledWith('user@example.com')
  })

  it('drops the confirmation on a new attempt', async () => {
    await openForgot()
    fill('tanzir@example.com')
    submit()
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(confirmation))
    fill('bad')
    submit()
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('disables the button while the request is pending and ignores a double submit', async () => {
    const request = vi.fn(() => new Promise<never>(() => {}))
    await openForgot(createTestApi({ requestPasswordReset: request }))
    fill('tanzir@example.com')
    submit()
    submit()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Password Reset' })).toBeDisabled())
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('maps an API fieldErrors.email to the field', async () => {
    const api = createTestApi({
      requestPasswordReset: () =>
        Promise.reject(new ApiError('VALIDATION', 'Please correct the highlighted fields.', { email: 'Unknown email.' })),
    })
    await openForgot(api)
    fill('tanzir@example.com')
    submit()
    expect(await screen.findByText('Unknown email.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('shows any other API error in the alert', async () => {
    const api = createTestApi({
      requestPasswordReset: () => Promise.reject(new ApiError('STORAGE_FULL', 'Something went wrong.')),
    })
    await openForgot(api)
    fill('tanzir@example.com')
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong.')
    expect(screen.getByRole('button', { name: 'Password Reset' })).toBeEnabled()
  })

  it('goes to Login from "Back to login"', async () => {
    const { router } = await openForgot()
    const link = screen.getByRole('link', { name: 'Back to login' })
    expect(link).toHaveAttribute('href', routes.login)
    fireEvent.click(link)
    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(routes.login)
  })
})
