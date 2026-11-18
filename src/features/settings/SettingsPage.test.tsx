import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiProvider } from '../../api/ApiProvider.tsx'
import type { FinbankApi } from '../../api/port.ts'
import { ApiError, type PasswordInput, type ProfileInput, type UserProfile } from '../../api/types.ts'
import { SettingsPage } from './SettingsPage.tsx'

const seeded: UserProfile = {
  fullName: 'Tanzir Rahman',
  email: 'tanzir.rahman@email.com',
  username: 'tanzir.rahman',
  phoneCountryCode: '+880',
  phoneNumber: '51547 58868',
  avatarUrl: null,
}

const savedAvatarUrl = 'data:image/jpeg;base64,SAVED'

function createFakeApi(overrides: Partial<FinbankApi> = {}) {
  let profile = structuredClone(seeded)
  const getProfile = vi.fn<FinbankApi['getProfile']>(() => Promise.resolve(structuredClone(profile)))
  const updateProfile = vi.fn<FinbankApi['updateProfile']>(({ avatar, ...fields }: ProfileInput) => {
    profile = { ...profile, ...fields, ...(avatar && { avatarUrl: savedAvatarUrl }) }
    return Promise.resolve(structuredClone(profile))
  })
  const changePassword = vi.fn<FinbankApi['changePassword']>((_input: PasswordInput) => Promise.resolve())
  const api = { getProfile, updateProfile, changePassword, ...overrides } as FinbankApi
  return { api, getProfile, updateProfile, changePassword }
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

  it('deep-links ?tab=security to the password form', async () => {
    renderAt('/settings?tab=security', createFakeApi().api)
    expect(tab('Security')).toHaveAttribute('aria-selected', 'true')
    const panel = screen.getByRole('tabpanel', { name: 'Security' })
    expect(await within(panel).findByLabelText('Old Password')).toBeInTheDocument()
    expect(within(panel).queryByLabelText('Full name')).not.toBeInTheDocument()
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

describe('ProfileForm profile picture', () => {
  let objectUrls = 0
  const createObjectURL = vi.fn((_file: Blob) => `blob:preview-${++objectUrls}`)
  const revokeObjectURL = vi.fn((_url: string) => {})
  const original = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL }

  beforeEach(() => {
    objectUrls = 0
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    // jsdom has no object URLs.
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
  })
  afterEach(() => {
    URL.createObjectURL = original.createObjectURL
    URL.revokeObjectURL = original.revokeObjectURL
  })

  const group = () => screen.getByRole('group', { name: 'Your Profile Picture' })
  const box = () => within(group()).getByRole('button')
  const boxImage = () => box().querySelector('img')
  const fileInput = () => within(group()).getByTestId('image-upload-input')
  const pick = (file: File) => fireEvent.change(fileInput(), { target: { files: [file] } })
  const png = (name = 'photo.png') => new File(['png'], name, { type: 'image/png' })
  const sized = (file: File, size: number) => {
    Object.defineProperty(file, 'size', { value: size })
    return file
  }
  const typeMessage = 'Choose a JPEG, PNG, WebP or GIF image.'
  const sizeMessage = 'Choose an image under 5 MB.'
  const decodeMessage = "We couldn't read that image."

  it('shows the label and the empty prompt beside the fields', async () => {
    renderAt('/settings', createFakeApi().api)
    await formLoaded()
    expect(box()).toHaveAccessibleName('Upload your photo')
    expect(box()).toHaveTextContent('Upload your photo')
    expect(boxImage()).toBeNull()
    expect(fileInput()).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif')
  })

  it('shows the saved avatar when there is one', async () => {
    const { api } = createFakeApi({
      getProfile: () => Promise.resolve({ ...seeded, avatarUrl: 'data:image/jpeg;base64,OLD' }),
    })
    renderAt('/settings', api)
    await formLoaded()
    expect(box()).toHaveAccessibleName('Change your photo')
    expect(boxImage()).toHaveAttribute('src', 'data:image/jpeg;base64,OLD')
  })

  it('previews a valid pick without saving it', async () => {
    const { api, updateProfile } = createFakeApi()
    renderAt('/settings', api)
    await formLoaded()
    const file = png()
    pick(file)
    expect(createObjectURL).toHaveBeenCalledWith(file)
    expect(boxImage()).toHaveAttribute('src', 'blob:preview-1')
    expect(box()).toHaveAccessibleName('Change your photo')
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it.each([
    ['a non-image', () => new File(['%PDF'], 'notes.pdf', { type: 'application/pdf' }), typeMessage],
    ['an SVG', () => new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' }), typeMessage],
    ['a 6 MB JPEG', () => sized(new File(['x'], 'big.jpg', { type: 'image/jpeg' }), 6 * 1024 * 1024), sizeMessage],
  ])('rejects %s inline and keeps the previous preview', async (_name, file, message) => {
    const { api, updateProfile } = createFakeApi()
    renderAt('/settings', api)
    await formLoaded()
    pick(png())
    pick(file())
    expect(screen.getByText(message)).toHaveClass('text-danger')
    expect(box()).toHaveAccessibleDescription(message)
    expect(boxImage()).toHaveAttribute('src', 'blob:preview-1')
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('keeps the saved avatar on an invalid pick, and a valid pick clears the error', async () => {
    const { api } = createFakeApi({
      getProfile: () => Promise.resolve({ ...seeded, avatarUrl: 'data:image/jpeg;base64,OLD' }),
    })
    renderAt('/settings', api)
    await formLoaded()
    pick(new File(['%PDF'], 'notes.pdf', { type: 'application/pdf' }))
    expect(screen.getByText(typeMessage)).toBeInTheDocument()
    expect(boxImage()).toHaveAttribute('src', 'data:image/jpeg;base64,OLD')
    pick(sized(png(), 5 * 1024 * 1024))
    expect(screen.queryByText(typeMessage)).not.toBeInTheDocument()
    expect(boxImage()).toHaveAttribute('src', 'blob:preview-1')
  })

  it('revokes a preview URL when it is replaced and on unmount', async () => {
    const { unmount } = renderAt('/settings', createFakeApi().api)
    await formLoaded()
    pick(png('a.png'))
    pick(png('b.png'))
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1')
    expect(revokeObjectURL).not.toHaveBeenCalledWith('blob:preview-2')
    unmount()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-2')
  })

  it('sends the picked photo with the fields, then shows the saved avatar', async () => {
    const { api, updateProfile } = createFakeApi()
    renderAt('/settings', api)
    await formLoaded()
    const file = png()
    pick(file)
    type(fullName(), 'Jane Doe')
    // The box goes from the preview straight to the saved photo, never back to the empty prompt.
    let flashed = false
    const observer = new MutationObserver(() => {
      if (!boxImage()) flashed = true
    })
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
    submit()
    expect(await screen.findByRole('status')).toHaveTextContent('Profile updated.')
    expect(updateProfile).toHaveBeenCalledWith({
      fullName: 'Jane Doe',
      email: 'tanzir.rahman@email.com',
      username: 'tanzir.rahman',
      phoneCountryCode: '+880',
      phoneNumber: '51547 58868',
      avatar: file,
    })
    await waitFor(() => expect(boxImage()).toHaveAttribute('src', savedAvatarUrl))
    observer.disconnect()
    expect(flashed).toBe(false)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1')
  })

  it('never shows the old saved avatar between the preview and the new one', async () => {
    const oldUrl = 'data:image/jpeg;base64,OLD'
    let profile: UserProfile = { ...seeded, avatarUrl: oldUrl }
    const { api } = createFakeApi({
      getProfile: () => Promise.resolve(structuredClone(profile)),
      updateProfile: ({ avatar, ...fields }) => {
        profile = { ...profile, ...fields, ...(avatar && { avatarUrl: savedAvatarUrl }) }
        return Promise.resolve(structuredClone(profile))
      },
    })
    renderAt('/settings', api)
    await formLoaded()
    expect(boxImage()).toHaveAttribute('src', oldUrl)
    pick(png())
    expect(boxImage()).toHaveAttribute('src', 'blob:preview-1')
    let flashed = false
    const observer = new MutationObserver(() => {
      if (boxImage()?.getAttribute('src') !== 'blob:preview-1' && boxImage()?.getAttribute('src') !== savedAvatarUrl) {
        flashed = true
      }
    })
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
    submit()
    await waitFor(() => expect(boxImage()).toHaveAttribute('src', savedAvatarUrl))
    observer.disconnect()
    expect(flashed).toBe(false)
  })

  it('keeps a photo picked while a save is in flight, and sends it next', async () => {
    let resolveSave!: (profile: UserProfile) => void
    const updateProfile = vi
      .fn<FinbankApi['updateProfile']>()
      .mockImplementationOnce(() => new Promise((r) => (resolveSave = r)))
      .mockResolvedValueOnce({ ...seeded, avatarUrl: savedAvatarUrl })
    renderAt('/settings', createFakeApi({ updateProfile }).api)
    await formLoaded()
    const a = png('a.png')
    const b = png('b.png')
    pick(a)
    submit()
    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1))
    expect(updateProfile).toHaveBeenLastCalledWith(expect.objectContaining({ avatar: a }))
    pick(b)
    expect(boxImage()).toHaveAttribute('src', 'blob:preview-2')
    await act(async () => resolveSave({ ...seeded, avatarUrl: 'data:image/jpeg;base64,A' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Update Profile' })).toBeEnabled())
    expect(boxImage()).toHaveAttribute('src', 'blob:preview-2')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    submit()
    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(2))
    expect(updateProfile).toHaveBeenLastCalledWith(expect.objectContaining({ avatar: b }))
  })

  it('sends no avatar when nothing was picked', async () => {
    const { api, updateProfile } = createFakeApi()
    renderAt('/settings', api)
    await formLoaded()
    submit()
    await screen.findByText('Profile updated.')
    expect(updateProfile.mock.calls[0]![0]).not.toHaveProperty('avatar')
  })

  it('hides the confirmation when a new photo is picked after a save', async () => {
    renderAt('/settings', createFakeApi().api)
    await formLoaded()
    submit()
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Profile updated.'))
    pick(png())
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('sends nothing when the fields are invalid, and keeps the preview', async () => {
    const { api, updateProfile } = createFakeApi()
    renderAt('/settings', api)
    await formLoaded()
    pick(png())
    type(fullName(), ' ')
    submit()
    expect(await screen.findByText('Full name is required.')).toBeInTheDocument()
    expect(updateProfile).not.toHaveBeenCalled()
    expect(boxImage()).toHaveAttribute('src', 'blob:preview-1')
  })

  it('shows fieldErrors.avatar under the box, keeps the preview and retries with it', async () => {
    const updateProfile = vi
      .fn<FinbankApi['updateProfile']>()
      .mockRejectedValueOnce(new ApiError('VALIDATION', decodeMessage, { avatar: decodeMessage }))
      .mockResolvedValueOnce({ ...seeded, avatarUrl: savedAvatarUrl })
    renderAt('/settings', createFakeApi({ updateProfile }).api)
    await formLoaded()
    const file = png()
    pick(file)
    submit()
    expect(await screen.findByText(decodeMessage)).toHaveClass('text-danger')
    expect(box()).toHaveAccessibleDescription(decodeMessage)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(boxImage()).toHaveAttribute('src', 'blob:preview-1')
    expect(revokeObjectURL).not.toHaveBeenCalled()

    submit()
    await screen.findByText('Profile updated.')
    expect(updateProfile).toHaveBeenLastCalledWith(expect.objectContaining({ avatar: file }))
    expect(screen.queryByText(decodeMessage)).not.toBeInTheDocument()
  })

  it('shows STORAGE_FULL as the alert and keeps the preview', async () => {
    const { api } = createFakeApi({
      updateProfile: () =>
        Promise.reject(new ApiError('STORAGE_FULL', 'Your browser storage is full. Free some space and try again.')),
    })
    renderAt('/settings', api)
    await formLoaded()
    pick(png())
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Your browser storage is full. Free some space and try again.')
    expect(boxImage()).toHaveAttribute('src', 'blob:preview-1')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
})

describe('PasswordForm', () => {
  const oldPassword = () => screen.getByLabelText('Old Password')
  const newPassword = () => screen.getByLabelText('New Password')
  const retype = () => screen.getByLabelText('Retype Password')
  const update = () => fireEvent.click(screen.getByRole('button', { name: 'Update Password' }))
  const passwordsLoaded = () => screen.findByLabelText('Old Password')
  const fill = (old: string, next: string, again: string) => {
    type(oldPassword(), old)
    type(newPassword(), next)
    type(retype(), again)
  }
  const valid = { oldPassword: 'old-secret', newPassword: 'new-secret-1', confirmPassword: 'new-secret-1' }
  const fieldMessages = [
    'Old password is required.',
    'New password is required.',
    'Use at least 8 characters.',
    'Retype your new password.',
    "Passwords don't match.",
  ]

  it('shows empty, masked, borderless password fields and the profile phone read-only', async () => {
    renderAt('/settings?tab=security', createFakeApi().api)
    await passwordsLoaded()
    for (const input of [oldPassword(), newPassword(), retype()]) {
      expect(input).toHaveAttribute('type', 'password')
      expect(input).toHaveValue('')
      expect(input).toHaveClass('border-transparent', 'text-subtle')
    }
    // The eye toggle stays on all three (human decision).
    expect(screen.getAllByRole('button', { name: 'Show password' })).toHaveLength(3)
    await waitFor(() => expect(phoneCode()).toHaveValue('+880'))
    expect(phoneNumber()).toHaveValue('51547 58868')
    for (const input of [phoneCode(), phoneNumber()]) {
      expect(input).toHaveAttribute('readonly')
      input.focus()
      expect(input).toHaveFocus()
    }
    expect(screen.getByTestId('phone-input')).toHaveClass('border-transparent')
  })

  it('changes the password: one call with the three values, cleared fields and "Password updated."', async () => {
    const { api, changePassword, updateProfile } = createFakeApi()
    const { router } = renderAt('/settings?tab=security', api)
    await passwordsLoaded()
    fill(valid.oldPassword, valid.newPassword, valid.confirmPassword)
    update()
    expect(await screen.findByText('Password updated.')).toBeInTheDocument()
    expect(changePassword).toHaveBeenCalledTimes(1)
    expect(changePassword).toHaveBeenCalledWith(valid)
    for (const input of [oldPassword(), newPassword(), retype()]) expect(input).toHaveValue('')
    expect(updateProfile).not.toHaveBeenCalled()
    expect(router.state.location.search).toBe('?tab=security')
    expect(phoneNumber()).toHaveValue('51547 58868')
  })

  it('hides the confirmation once a field is edited again', async () => {
    renderAt('/settings?tab=security', createFakeApi().api)
    await passwordsLoaded()
    fill(valid.oldPassword, valid.newPassword, valid.confirmPassword)
    update()
    expect(await screen.findByText('Password updated.')).toBeInTheDocument()
    type(oldPassword(), 'x')
    expect(screen.queryByText('Password updated.')).not.toBeInTheDocument()
  })

  it.each([
    ['a blank old password', ['', valid.newPassword, valid.confirmPassword], 'Old Password', 'Old password is required.'],
    ['a blank new password', [valid.oldPassword, '', valid.confirmPassword], 'New Password', 'New password is required.'],
    ['a blank retype', [valid.oldPassword, valid.newPassword, ''], 'Retype Password', 'Retype your new password.'],
    ['a short new password', [valid.oldPassword, 'short7!', 'short7!'], 'New Password', 'Use at least 8 characters.'],
    ['a mismatch', [valid.oldPassword, 'new-secret-1', 'new-secret-2'], 'Retype Password', "Passwords don't match."],
  ] as const)('rejects %s on its field and sends nothing', async (_name, [old, next, again], label, message) => {
    const { api, changePassword } = createFakeApi()
    renderAt('/settings?tab=security', api)
    await passwordsLoaded()
    fill(old, next, again)
    update()
    const error = await screen.findByText(message)
    const input = screen.getByLabelText(label)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(error.id)
    // Only that field errs.
    expect(fieldMessages.filter((m) => screen.queryByText(m))).toEqual([message])
    expect(changePassword).not.toHaveBeenCalled()
    expect(screen.queryByText('Password updated.')).not.toBeInTheDocument()
  })

  it('shows every required message at once on an empty submit', async () => {
    const { api, changePassword } = createFakeApi()
    renderAt('/settings?tab=security', api)
    await passwordsLoaded()
    update()
    expect(await screen.findByText('Old password is required.')).toBeInTheDocument()
    expect(screen.getByText('New password is required.')).toBeInTheDocument()
    expect(screen.getByText('Retype your new password.')).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('keeps spaces: eight spaces is accepted and sent unchanged', async () => {
    const { api, changePassword } = createFakeApi()
    renderAt('/settings?tab=security', api)
    await passwordsLoaded()
    const spaces = '        '
    fill(valid.oldPassword, spaces, spaces)
    update()
    expect(await screen.findByText('Password updated.')).toBeInTheDocument()
    expect(changePassword).toHaveBeenCalledWith({ oldPassword: valid.oldPassword, newPassword: spaces, confirmPassword: spaces })
  })

  it('maps adapter fieldErrors onto the fields and keeps the typed values', async () => {
    const { api } = createFakeApi({
      changePassword: () =>
        Promise.reject(new ApiError('VALIDATION', 'Please correct the highlighted fields.', { oldPassword: 'Old password is wrong.' })),
    })
    renderAt('/settings?tab=security', api)
    await passwordsLoaded()
    fill(valid.oldPassword, valid.newPassword, valid.confirmPassword)
    update()
    expect(await screen.findByText('Old password is wrong.')).toBeInTheDocument()
    expect(oldPassword()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(oldPassword()).toHaveValue(valid.oldPassword)
    expect(newPassword()).toHaveValue(valid.newPassword)
    expect(retype()).toHaveValue(valid.confirmPassword)
  })

  it('shows any other error as an alert without password text and keeps the typed values', async () => {
    const { api } = createFakeApi({
      changePassword: () => Promise.reject(new ApiError('UNKNOWN', 'Something went wrong. Please try again.')),
    })
    renderAt('/settings?tab=security', api)
    await passwordsLoaded()
    fill(valid.oldPassword, valid.newPassword, valid.confirmPassword)
    update()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Something went wrong. Please try again.')
    for (const value of Object.values(valid)) expect(alert).not.toHaveTextContent(value)
    expect(oldPassword()).toHaveValue(valid.oldPassword)
    expect(newPassword()).toHaveValue(valid.newPassword)
    expect(retype()).toHaveValue(valid.confirmPassword)
    expect(screen.queryByText('Password updated.')).not.toBeInTheDocument()
  })

  it('shows a STORAGE_FULL message exactly as the alert, without password text', async () => {
    const message = 'Your browser storage is full. Free some space and try again.'
    const { api } = createFakeApi({ changePassword: () => Promise.reject(new ApiError('STORAGE_FULL', message)) })
    renderAt('/settings?tab=security', api)
    await passwordsLoaded()
    fill(valid.oldPassword, valid.newPassword, valid.confirmPassword)
    update()
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(message)
    for (const value of Object.values(valid)) expect(alert).not.toHaveTextContent(value)
  })

  it('does not wait for a pending profile: the change works, and the phone fills in once it loads', async () => {
    let resolve!: (profile: UserProfile) => void
    const { api, changePassword } = createFakeApi({ getProfile: () => new Promise((r) => (resolve = r)) })
    renderAt('/settings?tab=security', api)
    expect(oldPassword()).toBeInTheDocument()
    expect(newPassword()).toBeInTheDocument()
    expect(retype()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update Password' })).toBeInTheDocument()
    expect(phoneNumber()).toHaveValue('')
    fill(valid.oldPassword, valid.newPassword, valid.confirmPassword)
    update()
    expect(await screen.findByText('Password updated.')).toBeInTheDocument()
    expect(changePassword).toHaveBeenCalledWith(valid)
    await act(async () => resolve(structuredClone(seeded)))
    await waitFor(() => expect(phoneNumber()).toHaveValue('51547 58868'))
    expect(phoneCode()).toHaveValue('+880')
  })

  it('still changes the password when the profile fails to load', async () => {
    const { api, changePassword } = createFakeApi({
      getProfile: () => Promise.reject(new ApiError('UNKNOWN', 'Something went wrong. Please try again.')),
    })
    renderAt('/settings?tab=security', api)
    expect(screen.getByRole('button', { name: 'Update Password' })).toBeInTheDocument()
    fill(valid.oldPassword, valid.newPassword, valid.confirmPassword)
    update()
    expect(await screen.findByText('Password updated.')).toBeInTheDocument()
    expect(changePassword).toHaveBeenCalledWith(valid)
    expect(phoneCode()).toHaveValue('')
    expect(phoneNumber()).toHaveValue('')
  })

  it('does not keep the passwords in the mutation cache after a success', async () => {
    const { api } = createFakeApi()
    const { queryClient } = renderAt('/settings?tab=security', api)
    await passwordsLoaded()
    fill(valid.oldPassword, valid.newPassword, valid.confirmPassword)
    update()
    expect(await screen.findByText('Password updated.')).toBeInTheDocument()
    await waitFor(() => {
      const variables = queryClient.getMutationCache().getAll().map((m) => m.state.variables)
      expect(JSON.stringify(variables ?? [])).not.toContain(valid.newPassword)
    })
  })

  it('ignores a second submit while the change is in flight', async () => {
    let resolve!: () => void
    const changePassword = vi.fn<FinbankApi['changePassword']>(() => new Promise<void>((r) => (resolve = r)))
    const { api } = createFakeApi({ changePassword })
    renderAt('/settings?tab=security', api)
    await passwordsLoaded()
    fill(valid.oldPassword, valid.newPassword, valid.confirmPassword)
    update()
    await waitFor(() => expect(changePassword).toHaveBeenCalledTimes(1))
    fireEvent.submit(screen.getByRole('button', { name: 'Update Password' }).closest('form')!)
    await act(async () => resolve())
    expect(await screen.findByText('Password updated.')).toBeInTheDocument()
    expect(changePassword).toHaveBeenCalledTimes(1)
  })
})
