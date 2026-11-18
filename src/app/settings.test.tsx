// Full-app Settings flow over one shared mock storage (localStorage / sessionStorage): profile
// edits refresh the shell without a reload, persist across a reload, and survive logout + login
// with either the new or the old email, while the session stays untouched. A picked photo is
// saved with "Update Profile" and shows in the sidebar the same way. A password change keeps the
// user signed in and stores nothing.
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MOCK_STORAGE_KEY, SESSION_STORAGE_KEY } from '../api/mock/mockApi.ts'
import { seed } from '../api/mock/seed.ts'
import { routes } from './routes.ts'
import { createTestApi, renderAt, stubAvatarUrl, watchDom } from './test-utils.tsx'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

const edited = { fullName: 'Jane Doe', email: 'jane.doe@email.com', username: 'jane.doe' }

const userName = () => screen.getByTestId('user-name')
const header = () => screen.getByRole('banner')
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

async function signIn() {
  const api = createTestApi()
  await api.login({ email: seed.profile.email, password: 'secret', persistent: true })
  return api
}

/** Opens Settings signed in, edits name, email and username, and saves. */
async function saveEditedProfile() {
  const view = renderAt(routes.settings, await signIn())
  await waitFor(() => expect(screen.getByLabelText('Full name')).toHaveValue(seed.profile.fullName))
  await waitFor(() => expect(userName()).toHaveTextContent(seed.profile.fullName))
  type('Full name', edited.fullName)
  type('Email', edited.email)
  type('Username', edited.username)
  fireEvent.click(screen.getByRole('button', { name: 'Update Profile' }))
  expect(await screen.findByText('Profile updated.')).toBeInTheDocument()
  return view
}

async function logInWith(email: string) {
  await screen.findByRole('heading', { level: 1, name: 'Log in' })
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
  fireEvent.click(screen.getByRole('button', { name: 'Login' }))
  expect(await within(await screen.findByRole('banner')).findByText('Hello Jane')).toBeInTheDocument()
  await waitFor(() => expect(userName()).toHaveTextContent(edited.fullName))
}

describe('Settings profile flow', () => {
  it('updates the sidebar and greeting without a reload and leaves the session untouched', async () => {
    const { router, api } = await saveEditedProfile()
    const sessionStored = JSON.stringify({ userId: 'usr_1', persistent: true })
    await waitFor(() => expect(userName()).toHaveTextContent(edited.fullName))
    // No redirect: still on Settings, signed in with the same session.
    expect(router.state.location.pathname).toBe(routes.settings)
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBe(sessionStored)
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    await expect(api.getSession()).resolves.toEqual({ userId: 'usr_1', persistent: true })

    await act(() => router.navigate(routes.overview))
    expect(await within(header()).findByText('Hello Jane')).toBeInTheDocument()
  })

  it('persists the edit across a reload on the same storage', async () => {
    const { unmount } = await saveEditedProfile()
    unmount()
    // A fresh adapter and query client over the same storage: a page reload.
    renderAt(routes.settings, createTestApi())
    await waitFor(() => expect(screen.getByLabelText('Full name')).toHaveValue(edited.fullName))
    expect(screen.getByLabelText('Email')).toHaveValue(edited.email)
    expect(screen.getByLabelText('Username')).toHaveValue(edited.username)
    await waitFor(() => expect(userName()).toHaveTextContent(edited.fullName))
  })

  it.each([
    ['the new email', edited.email],
    ['the old email', seed.profile.email],
  ])('keeps the edited profile after logout and a login with %s', async (_name, email) => {
    await saveEditedProfile()
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
    await logInWith(email)
    await expect(createTestApi().getProfile()).resolves.toMatchObject(edited)
  })
})

describe('Settings password flow', () => {
  const passwords = { old: 'old-secret', next: 'new-secret-1' }

  it('changes the password while staying signed in, then logout and login still work', async () => {
    const api = await signIn()
    const sessionStored = localStorage.getItem(SESSION_STORAGE_KEY)
    const { router } = renderAt(`${routes.settings}?tab=security`, api)
    await screen.findByLabelText('Old Password')
    await waitFor(() => expect(userName()).toHaveTextContent(seed.profile.fullName))
    const stateStored = localStorage.getItem(MOCK_STORAGE_KEY)
    expect(screen.getByLabelText('Phone Number number')).toHaveValue(seed.profile.phoneNumber)

    type('Old Password', passwords.old)
    type('New Password', passwords.next)
    type('Retype Password', passwords.next)
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }))
    expect(await screen.findByText('Password updated.')).toBeInTheDocument()
    for (const label of ['Old Password', 'New Password', 'Retype Password']) {
      expect(screen.getByLabelText(label)).toHaveValue('')
    }

    // Still signed in on the Security tab, with the same session and an unchanged profile.
    expect(router.state.location.pathname).toBe(routes.settings)
    expect(router.state.location.search).toBe('?tab=security')
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBe(sessionStored)
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(MOCK_STORAGE_KEY)).toBe(stateStored)
    await expect(api.getSession()).resolves.toEqual({ userId: 'usr_1', persistent: true })
    await expect(api.getProfile()).resolves.toEqual(seed.profile)
    expect(userName()).toHaveTextContent(seed.profile.fullName)
    // No password reaches storage.
    const everything = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage })
    expect(everything).not.toContain(passwords.old)
    expect(everything).not.toContain(passwords.next)

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
    await screen.findByRole('heading', { level: 1, name: 'Log in' })
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: seed.profile.email } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: passwords.next } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))
    expect(await within(await screen.findByRole('banner')).findByText('Hello Tanzir')).toBeInTheDocument()
  })
})

describe('Settings profile picture flow', () => {
  const original = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL }
  let objectUrls = 0

  beforeEach(() => {
    objectUrls = 0
    // jsdom has no object URLs.
    URL.createObjectURL = () => `blob:preview-${++objectUrls}`
    URL.revokeObjectURL = () => {}
  })
  afterEach(() => {
    URL.createObjectURL = original.createObjectURL
    URL.revokeObjectURL = original.revokeObjectURL
    vi.restoreAllMocks()
  })

  const sidebarAvatar = () => userName().closest('div.flex.h-10')!.querySelector('img')!
  const box = () => within(screen.getByRole('group', { name: 'Your Profile Picture' })).getByRole('button')
  const boxImage = () => box().querySelector('img')
  const pick = (file: File) =>
    fireEvent.change(screen.getByTestId('image-upload-input'), { target: { files: [file] } })
  const photo = (bytes: number) => new File([new Uint8Array(bytes)], 'photo.png', { type: 'image/png' })
  const storedAvatar = () => JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY) ?? 'null')?.profile?.avatarUrl
  const save = () => fireEvent.click(screen.getByRole('button', { name: 'Update Profile' }))

  /** Opens Settings signed in, picks a photo of `bytes` bytes and saves it. */
  async function saveAvatar(bytes = 10) {
    const view = renderAt(routes.settings, await signIn())
    await waitFor(() => expect(screen.getByLabelText('Full name')).toHaveValue(seed.profile.fullName))
    await waitFor(() => expect(userName()).toHaveTextContent(seed.profile.fullName))
    const placeholder = sidebarAvatar().getAttribute('src')
    pick(photo(bytes))
    expect(boxImage()).toHaveAttribute('src', 'blob:preview-1')
    // Nothing is stored on pick.
    expect(storedAvatar()).toBeNull()
    expect(sidebarAvatar()).toHaveAttribute('src', placeholder)
    // The box never falls back to the empty prompt between the preview and the saved photo.
    const flash = watchDom(() => boxImage() === null)
    save()
    expect(await screen.findByText('Profile updated.')).toBeInTheDocument()
    await waitFor(() => expect(sidebarAvatar()).toHaveAttribute('src', stubAvatarUrl(bytes)))
    await waitFor(() => expect(boxImage()).toHaveAttribute('src', stubAvatarUrl(bytes)))
    expect(flash.stop()).toBe(false)
    expect(storedAvatar()).toBe(stubAvatarUrl(bytes))
    return view
  }

  it('saves the picked photo and the sidebar shows it without a reload', async () => {
    const { router } = await saveAvatar()
    expect(router.state.location.pathname).toBe(routes.settings)
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBe(JSON.stringify({ userId: 'usr_1', persistent: true }))
  })

  it('keeps the photo across a reload', async () => {
    const { unmount } = await saveAvatar()
    unmount()
    renderAt(routes.settings, createTestApi())
    await waitFor(() => expect(sidebarAvatar()).toHaveAttribute('src', stubAvatarUrl(10)))
    await waitFor(() => expect(boxImage()).toHaveAttribute('src', stubAvatarUrl(10)))
  })

  it('keeps the photo after logout and login', async () => {
    await saveAvatar()
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
    await screen.findByRole('heading', { level: 1, name: 'Log in' })
    expect(storedAvatar()).toBe(stubAvatarUrl(10))
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: seed.profile.email } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))
    await within(await screen.findByRole('banner')).findByText('Hello Tanzir')
    await waitFor(() => expect(sidebarAvatar()).toHaveAttribute('src', stubAvatarUrl(10)))
  })

  it('keeps the old photo in storage and the sidebar on STORAGE_FULL, with the preview kept', async () => {
    await saveAvatar(10)
    pick(photo(20))
    expect(boxImage()).toHaveAttribute('src', 'blob:preview-2')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    save()
    expect(await screen.findByRole('alert')).toHaveTextContent('Your browser storage is full. Free some space and try again.')
    vi.restoreAllMocks()
    expect(storedAvatar()).toBe(stubAvatarUrl(10))
    expect(sidebarAvatar()).toHaveAttribute('src', stubAvatarUrl(10))
    expect(boxImage()).toHaveAttribute('src', 'blob:preview-2')
    await expect(createTestApi().getProfile()).resolves.toMatchObject({ avatarUrl: stubAvatarUrl(10) })
  })
})
