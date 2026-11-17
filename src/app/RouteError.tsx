import { Button } from '../ui/Button.tsx'

/**
 * The app's error screen: the `errorElement` of every top-level route, shown instead of React
 * Router's developer error page when a route throws while rendering or loading.
 */
export function RouteError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface">
      <h1 className="text-24 font-semibold text-ink">Something went wrong</h1>
      <p className="text-16 text-muted">An unexpected error occurred. Please reload the page.</p>
      <Button onClick={() => window.location.reload()}>Reload</Button>
    </div>
  )
}
