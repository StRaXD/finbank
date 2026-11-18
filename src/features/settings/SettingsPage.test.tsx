import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ApiProvider } from '../../api/ApiProvider.tsx'
import type { FinbankApi } from '../../api/port.ts'
import { ApiError, type ProfileInput, type UserProfile } from '../../api/types.ts'
import { SettingsPage } from './SettingsPage.tsx'

const seeded: UserProfile = {
  fullName: 'Tanzir Rahman',
  email: 'tanzir.rahman@email.com',
  username: 'tanzir.rahman',
  phoneCountryCode: '+880',
  phoneNumber: '51547 58868',
  avatarUrl: null,
}

function createFakeApi(overrides: Partial<FinbankApi> = {}) {
  let profile = structuredClone(seeded)
  const getProfile = vi.fn<FinbankApi['getProfile']>(() => Promise.resolve(structuredClone(profile)))
  const updateProfile = vi.fn<FinbankApi['updateProfile']>((input: ProfileInput) => {
    profile = { ...profile, ...input }
    return Promise.resolve(structuredClone(profile))
  })
  const api = { getProfile, updateProfile, ...overrides } as FinbankApi
  return { api, getProfile, updateProfile }
}

function renderAt(path: string, api: FinbankApi) {
  const router = createMemoryRouter([{ path: '/settings', element: <SettingsPage /> }], { initialEntries: [path] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(
    <ApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ApiProvider>,
  )
  return { ...view, router, queryClient }
}

const tab = (name: string) => screen.getByRole('tab', { name })
const fullName = () => screen.getByLabelText('Full name')
const email = () => screen.getByLabelText('Email')
const username = () => screen.getByLabelText('Username')
const phoneCode = () => screen.getByLabelText('Phone Number')
const phoneNumber = () => screen.getByLabelText('Phone Number number')
const type = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } })
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Update Profile' }))
const formLoaded = () => waitFor(() => expect(fullName()).toHaveValue('Tanzir Rahman'))

describe('SettingsPage tabs', () => {
  it.each(['/settings', '/settings?tab=account', '/settings?tab=bogus'])(
    'shows the Account tab, prefilled, at %s, in one card with no page heading',
    async (path) => {
      renderAt(path, createFakeApi().api)
      await formLoaded()
      expect(tab('Account')).toHaveAttribute('aria-selected', 'true')
      expect(tab('Security')).toHaveAttribute('aria-selected', 'false')
      expect(screen.getByRole('tabpanel', { name: 'Account' })).toBeInTheDocument()
      expect(screen.queryByRole('heading')).not.toBeInTheDocument()
      expect(screen.getAllByTestId('card-body')).toHaveLength(1)
      expect(email()).toHaveValue('tanzir.rahman@email.com')
      expect(username()).toHaveValue('tanzir.rahman')
      expect(phoneCode()).toHaveValue('+880')
      expect(phoneNumber()).toHaveValue('51547 58868')
    },
  )

  it('deep-links ?tab=security to the Security placeholder', () => {
    renderAt('/settings?tab=security', createFakeApi().api)
    expect(tab('Security')).toHaveAttribute('aria-selected', 'true')
    const panel = screen.getByRole('tabpanel', { name: 'Security' })
    expect(within(panel).queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('keeps the tab in the URL on click and arrow keys, pushing history so Back returns', async () => {
    const { router } = renderAt('/settings', createFakeApi().api)
    await formLoaded()
    fireEvent.click(tab('Security'))
    await waitFor(() => expect(router.state.location.search).toBe('?tab=security'))
    expect(router.state.historyAction).toBe('PUSH')
    expect(screen.getByRole('tabpanel', { name: 'Security' })).toBeInTheDocument()

    fireEvent.keyDown(tab('Security'), { key: 'ArrowLeft' })
    await waitFor(() => expect(router.state.location.search).toBe('?tab=account'))
    expect(await screen.findByRole('tabpanel', { name: 'Account' })).toBeInTheDocument()

    await act(() => router.navigate(-1))
    expect(router.state.location.search).toBe('?tab=security')
    expect(tab('Security')).toHaveAttribute('aria-selected', 'true')
  })

  it('shows a loading state, not the form, until the profile loads', async () => {
    let resolve!: (profile: UserProfile) => void
    const { api } = createFakeApi({ getProfile: () => new Promise((r) => (resolve = r)) })
    renderAt('/settings', api)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument()
    await act(async () => resolve(structuredClone(seeded)))
    await formLoaded()
  })
})

describe('ProfileForm', () => {
  it('uses borderless fields and the phone row', async () => {
    renderAt('/settings', createFakeApi().api)
    await formLoaded()
    for (const input of [fullName(), email(), username()]) expect(input).toHaveClass('border-transparent')
    expect(screen.getByTestId('phone-input')).toHaveClass('border-transparent')
  })

  it('saves the trimmed edit, shows "Profile updated." and refetches the profile', async () => {
    const { api, updateProfile, getProfile } = createFakeApi()
    renderAt('/settings', api)
    await formLoaded()
    type(fullName(), '  Jane Doe ')
    submit()
    expect(await screen.findByRole('status')).toHaveTextContent('Profile updated.')
    expect(updateProfile).toHaveBeenCalledWith({
      fullName: 'Jane Doe',
      email: 'tanzir.rahman@email.com',
      username: 'tanzir.rahman',
      phoneCountryCode: '+880',
      phoneNumber: '51547 58868',
    })
    expect(getProfile).toHaveBeenCalledTimes(2)
    expect(fullName()).toHaveValue('Jane Doe')
  })

  it('hides the confirmation on a later edit and does not bring it back on a failed new attempt', async () => {
    renderAt('/settings', createFakeApi().api)
    await formLoaded()
    type(fullName(), 'Jane Doe')
    submit()
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Profile updated.'))
    type(username(), 'jane.doe')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    type(fullName(), '')
    submit()
    expect(await screen.findByText('Full name is required.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it.each([
    ['Full name', fullName, 'Full name is required.'],
    ['Username', username, 'Username is required.'],
    ['Email', email, 'Email is required.'],
  ] as const)('requires %s', async (_name, input, message) => {
    const { api, updateProfile } = createFakeApi()
    renderAt('/settings', api)
    await formLoaded()
    type(input(), '   ')
    submit()
    const error = await screen.findByText(message)
    expect(error).toHaveClass('text-danger')
    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('requires both phone parts', async () => {
    const { api, updateProfile } = createFakeApi()
    renderAt('/settings', api)
    await formLoaded()
    type(phoneCode(), '')
    type(phoneNumber(), '')
    submit()
    expect(await screen.findByText('Country code is required. Phone number is required.')).toHaveClass('text-danger')
    expect(phoneCode()).toHaveAttribute('aria-invalid', 'true')
    expect(phoneNumber()).toHaveAttribute('aria-invalid', 'true')
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('rejects a malformed email', async () => {
    const { api, updateProfile } = createFakeApi()
    renderAt('/settings', api)
    await formLoaded()
    type(email(), 'foo@')
    submit()
    expect(await screen.findByText('Enter a valid email address.')).toHaveClass('text-danger')
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('maps adapter fieldErrors onto the fields', async () => {
    const { api } = createFakeApi({
      updateProfile: () =>
        Promise.reject(new ApiError('VALIDATION', 'Please correct the highlighted fields.', { email: 'Email is taken.' })),
    })
    renderAt('/settings', api)
    await formLoaded()
    submit()
    expect(await screen.findByText('Email is taken.')).toHaveClass('text-danger')
    expect(email()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('shows any other error as an alert and keeps the typed values', async () => {
    const { api } = createFakeApi({
      updateProfile: () =>
        Promise.reject(new ApiError('STORAGE_FULL', 'Your browser storage is full. Free some space and try again.')),
    })
    renderAt('/settings', api)
    await formLoaded()
    type(fullName(), 'Jane Doe')
    submit()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Your browser storage is full. Free some space and try again.')
    expect(alert).toHaveClass('text-danger')
    expect(fullName()).toHaveValue('Jane Doe')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
})
