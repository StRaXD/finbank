// The single route table. `router.tsx` builds the browser router from it; tests build a memory
// router from the same objects.
import { lazy, Suspense } from 'react'
import { Navigate, type RouteObject } from 'react-router'
import { ForgotPasswordPage, LoginPage, SignupPage, type AuthPaths } from '../features/auth/index.ts'
import { AccountDetailsPage, BalancesPage } from '../features/balances/index.ts'
import { BillsPage } from '../features/bills/index.ts'
import { OverviewPage } from '../features/overview/index.ts'
import { TransactionsPage } from '../features/transactions/index.ts'
import { AppShell } from './AppShell/AppShell.tsx'
import { PageBusy } from './PageBusy.tsx'
import { PlaceholderPage } from './PlaceholderPage.tsx'
import { RedirectIfSession } from './RedirectIfSession.tsx'
import { RequireSession } from './RequireSession.tsx'
import { RouteError } from './RouteError.tsx'
import { routePatterns, routes } from './routes.ts'

const authPaths: AuthPaths = {
  login: routes.login,
  signup: routes.signup,
  forgotPassword: routes.forgotPassword,
}

// Dev-only: the Stories 1.2/1.3 specimen, loaded lazily. Production builds drop the whole branch
// (and with it the dynamic import), so the specimen never ships.
function devRoutes(): RouteObject[] {
  if (!import.meta.env.DEV || !routes.specimen) return []
  const Specimen = lazy(() => import('./App.tsx'))
  return [
    {
      path: routes.specimen,
      errorElement: <RouteError />,
      element: (
        <Suspense fallback={<PageBusy />}>
          <Specimen />
        </Suspense>
      ),
    },
  ]
}

// Every top-level route renders `RouteError` when anything below it throws, so a render error
// never shows React Router's default developer page.
export const routeObjects: RouteObject[] = [
  {
    // Also owns the post-sign-in redirect: once the session is seeded, it sends the user to Overview.
    element: <RedirectIfSession />,
    errorElement: <RouteError />,
    children: [
      { path: routes.login, element: <LoginPage paths={authPaths} /> },
      { path: routes.signup, element: <SignupPage paths={authPaths} /> },
      { path: routes.forgotPassword, element: <ForgotPasswordPage paths={authPaths} /> },
    ],
  },
  {
    element: <RequireSession />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: routes.overview, element: <OverviewPage accountDetailsPath={routes.accountDetails} /> },
          { path: routes.balances, element: <BalancesPage accountDetailsPath={routes.accountDetails} /> },
          { path: routePatterns.accountDetails, element: <AccountDetailsPage balancesPath={routes.balances} /> },
          { path: routes.transactions, element: <TransactionsPage /> },
          { path: routes.bills, element: <BillsPage /> },
          { path: routes.expenses, element: <PlaceholderPage title="Expenses" /> },
          { path: routes.goals, element: <PlaceholderPage title="Goals" /> },
          { path: routes.settings, element: <PlaceholderPage title="Settings" /> },
        ],
      },
    ],
  },
  ...devRoutes(),
  { path: routePatterns.unknown, element: <Navigate to={routes.overview} replace />, errorElement: <RouteError /> },
]
