import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { SESSION_STORAGE_KEY } from '../api/mock/mockApi.ts'
import type { FinbankApi } from '../api/port.ts'
import { qk } from '../api/queryKeys.ts'
import { ApiError, type UserProfile } from '../api/types.ts'
import avatarPlaceholder from '../assets/avatar-placeholder.svg'
import { useOverlayHost } from '../ui/overlayHost.ts'
import { AppShell } from './AppShell/AppShell.tsx'
import { RequireSession } from './RequireSession.tsx'
import { routes } from './routes.ts'
import { createTestApi, renderAt } from './test-utils.tsx'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

async function signedInApi(overrides: Partial<FinbankApi> = {}) {
  const api = createTestApi(overrides)
  await api.login({ email: 'tanzir@example.com', password: 'secret', persistent: true })
  return api
}

/** Renders `path` signed in and waits for the shell and its profile name. */
async function openShell(path: string, api?: FinbankApi) {
  const view = renderAt(path, api ?? (await signedInApi()))
  await screen.findByRole('navigation', { name: 'Main' })
  return view
}

const nav = () => screen.getByRole('navigation', { name: 'Main' })
const activeLinks = () => within(nav()).getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page')
const sidebar = () => nav().closest('aside') as HTMLElement
const header = () => screen.getByRole('banner')

/** Wraps every API method in a call counter. */
function countCalls(api: FinbankApi) {
  const calls: string[] = []
  const counted = Object.fromEntries(
    Object.entries(api).map(([name, fn]) => [
      name,
      (...args: unknown[]) => {
        calls.push(name)
        return (fn as (...a: unknown[]) => unknown)(...args)
      },
    ]),
  ) as unknown as FinbankApi
  return { api: counted, calls }
}

describe('app shell', () => {
  it('lists the seven sections in order, each with its href', async () => {
    await openShell(routes.overview)
    const links = within(nav()).getAllByRole('link')
    expect(links.map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Overview', routes.overview],
      ['Balances', routes.balances],
      ['Transactions', routes.transactions],
      ['Bills', routes.bills],
      ['Expenses', routes.expenses],
      ['Goals', routes.goals],
      ['Settings', routes.settings],
    ])
  })

  it('activates only Overview at the root', async () => {
    await openShell(routes.overview)
    expect(activeLinks().map((l) => l.textContent)).toEqual(['Overview'])
    expect(activeLinks()[0]).toHaveClass('bg-primary', 'font-bold')
  })

  it('activates Balances on a deep account route and shows Account Details', async () => {
    await openShell(routes.accountDetails('acc_1'))
    expect(screen.getByRole('heading', { level: 1, name: 'Account Details' })).toBeInTheDocument()
    expect(activeLinks().map((l) => l.textContent)).toEqual(['Balances'])
  })

  it('navigates to Goals from the sidebar', async () => {
    const { router } = await openShell(routes.overview)
    fireEvent.click(within(nav()).getByRole('link', { name: 'Goals' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Goals' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(routes.goals)
    expect(activeLinks().map((l) => l.textContent)).toEqual(['Goals'])
  })

  it('shows today and the profile name from the API', async () => {
    await openShell(routes.balances)
    expect(within(header()).getByText('May 19, 2023')).toBeInTheDocument()
    expect(await screen.findByText('Tanzir Rahman')).toBeInTheDocument()
    expect(within(sidebar()).getByRole('img', { name: 'FINEbank.IO' })).toBeInTheDocument()
    // The seed profile has `avatarUrl: null`, so the placeholder shows.
    expect(sidebar().querySelector('img[alt=""]')).toHaveAttribute('src', avatarPlaceholder)
  })

  it('uses the profile avatar when set, otherwise the placeholder', async () => {
    const api = await signedInApi()
    const profile: UserProfile = { ...(await api.getProfile()), avatarUrl: 'https://example.com/me.png' }
    renderAt(routes.overview, { ...api, getProfile: () => Promise.resolve(profile) })
    await screen.findByText(profile.fullName)
    const avatar = sidebar().querySelector('img[alt=""]')
    expect(avatar).toHaveAttribute('src', 'https://example.com/me.png')
  })

  it('goes to the Settings Account tab from View profile', async () => {
    const { router } = await openShell(routes.overview)
    const link = screen.getByRole('link', { name: 'View profile' })
    expect(link).toHaveAttribute('href', routes.viewProfile)
    fireEvent.click(link)
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(`${router.state.location.pathname}${router.state.location.search}`).toBe(routes.viewProfile)
    expect(activeLinks().map((l) => l.textContent)).toEqual(['Settings'])
  })

  it('keeps the shell working with a placeholder avatar and empty name when the profile fails', async () => {
    const api = await signedInApi({ getProfile: () => Promise.reject(new ApiError('UNKNOWN', 'No profile.')) })
    const { queryClient } = await openShell(routes.overview, api)
    // The app query client retries once (about 1 s) before the error settles.
    await waitFor(() => expect(queryClient.getQueryState(qk.profile())?.status).toBe('error'), { timeout: 4000 })
    expect(screen.getByTestId('user-name')).toBeEmptyDOMElement()
    expect(screen.getByTestId('user-name')).toHaveClass('h-6')
    expect(sidebar().querySelector('img[alt=""]')).toHaveAttribute('src', avatarPlaceholder)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    fireEvent.click(within(nav()).getByRole('link', { name: 'Bills' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Upcoming Bills' })).toBeInTheDocument()
  })

  it('logs out to Login, clearing the session and the cached profile', async () => {
    const { router, queryClient } = await openShell(routes.balances)
    await screen.findByText('Tanzir Rahman')
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(routes.login)
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    await waitFor(() => expect(queryClient.getQueryData(qk.profile())).toBeUndefined())
    expect(queryClient.getQueryData(qk.session())).toBeNull()
  })

  it('stays signed in and re-enables Logout when logout fails', async () => {
    let rejectLogout: ((error: ApiError) => void) | undefined
    const api = await signedInApi({
      logout: () =>
        new Promise<void>((_, reject) => {
          rejectLogout = reject
        }),
    })
    const { router } = await openShell(routes.goals, api)
    const button = screen.getByRole('button', { name: 'Logout' })
    fireEvent.click(button)
    await waitFor(() => expect(button).toBeDisabled())
    await act(async () => rejectLogout?.(new ApiError('UNKNOWN', 'Could not log out.')))
    await waitFor(() => expect(button).toBeEnabled())
    expect(router.state.location.pathname).toBe(routes.goals)
    expect(screen.getByRole('heading', { level: 1, name: 'Goals' })).toBeInTheDocument()
  })

  it('keeps the bell, kebab and search inert', async () => {
    const counted = countCalls(await signedInApi())
    const { router } = await openShell(routes.bills, counted.api)
    await screen.findByText('Tanzir Rahman')
    const before = counted.calls.length

    const bell = screen.getByRole('button', { name: 'Notifications' })
    const kebab = screen.getByRole('button', { name: 'More options' })
    for (const button of [bell, kebab]) {
      expect(button).toHaveAttribute('type', 'button')
      expect(button).toHaveAttribute('aria-disabled', 'true')
      fireEvent.click(button)
    }
    expect(screen.getByTestId('unread-dot')).toHaveClass('bg-primary')

    const search = screen.getByRole('textbox', { name: 'Search' })
    expect(search).toHaveAttribute('placeholder', 'Search here')
    fireEvent.change(search, { target: { value: 'rent' } })
    expect(search).toHaveValue('rent')
    fireEvent.keyDown(search, { key: 'Enter' })
    const form = screen.getByRole('search')
    const submitted = fireEvent.submit(form)
    expect(submitted).toBe(false) // default prevented

    expect(router.state.location.pathname).toBe(routes.bills)
    expect(router.state.location.search).toBe('')
    expect(counted.calls.slice(before)).toEqual([])
    expect(screen.getByRole('heading', { level: 1, name: 'Upcoming Bills' })).toBeInTheDocument()
    expect(activeLinks().map((l) => l.textContent)).toEqual(['Bills'])
  })

  it('has the landmarks and keeps controls in visual (tab) order', async () => {
    await openShell(routes.overview)
    const main = screen.getByRole('main')
    expect(main.querySelector('#content-overlay-root')).not.toBeNull()
    expect(main.lastElementChild).toHaveAttribute('id', 'content-overlay-root')
    expect(within(header()).getByText('May 19, 2023')).toBeInTheDocument()
    expect(header().querySelector('[data-icon="chevronsRight"]')).toHaveAttribute('aria-hidden', 'true')

    const order = [
      ...within(nav()).getAllByRole('link'),
      screen.getByRole('button', { name: 'Logout' }),
      screen.getByRole('link', { name: 'View profile' }),
      screen.getByRole('button', { name: 'More options' }),
      screen.getByRole('button', { name: 'Notifications' }),
      screen.getByRole('textbox', { name: 'Search' }),
    ]
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
    for (const el of order) expect(el).not.toHaveAttribute('tabindex', '-1')
    // No greeting or page title in the shell: the only h1 is the placeholder page's.
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})

describe('app shell overlay host', () => {
  function OverlayProbe() {
    const host = useOverlayHost()
    const [releases, setReleases] = useState<(() => void)[]>([])
    return (
      <div>
        <p>{host.container?.id ?? 'no container'}</p>
        <button type="button" onClick={() => setReleases((r) => [...r, host.acquireInert()])}>
          acquire
        </button>
        <button type="button" onClick={() => releases.shift()?.()}>
          release
        </button>
      </div>
    )
  }

  const probeRoutes = [
    {
      element: <RequireSession />,
      children: [{ element: <AppShell />, children: [{ path: routes.overview, element: <OverlayProbe /> }] }],
    },
  ]

  it('exposes #content-overlay-root and makes the chrome inert until every hold is released', async () => {
    renderAt(routes.overview, await signedInApi(), probeRoutes)
    expect(await screen.findByText('content-overlay-root')).toBeInTheDocument()
    expect(sidebar()).not.toHaveAttribute('inert')
    expect(header()).not.toHaveAttribute('inert')

    const acquire = screen.getByRole('button', { name: 'acquire' })
    const release = screen.getByRole('button', { name: 'release' })
    fireEvent.click(acquire)
    fireEvent.click(acquire)
    expect(sidebar()).toHaveAttribute('inert')
    expect(header()).toHaveAttribute('inert')

    fireEvent.click(release)
    expect(sidebar()).toHaveAttribute('inert')
    expect(header()).toHaveAttribute('inert')

    fireEvent.click(release)
    expect(sidebar()).not.toHaveAttribute('inert')
    expect(header()).not.toHaveAttribute('inert')
    expect(screen.getByRole('main')).not.toHaveAttribute('inert')
  })
})
