// Full-app Settings flow over one shared mock storage (localStorage / sessionStorage): profile
// edits refresh the shell without a reload, persist across a reload, and survive logout + login
// with either the new or the old email, while the session stays untouched.
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { SESSION_STORAGE_KEY } from '../api/mock/mockApi.ts'
import { seed } from '../api/mock/seed.ts'
import { routes } from './routes.ts'
import { createTestApi, renderAt } from './test-utils.tsx'

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
