// The overlay host (AD-13): where content-column overlays (Story 1.9's Modal) portal to, and the
// switch that makes the shell chrome (sidebar, top bar) `inert` while an overlay is open.
import { createContext, useCallback, useContext, useState } from 'react'

export type OverlayHost = {
  /** The portal target inside the content column; `null` until mounted or outside a provider. */
  container: HTMLElement | null
  /** Marks the shell chrome inert until the returned release function is called (ref-counted). */
  acquireInert(): () => void
}

const noOverlayHost: OverlayHost = { container: null, acquireInert: () => () => {} }

export const OverlayHostContext = createContext<OverlayHost>(noOverlayHost)

/** The nearest overlay host, or a no-op host (`container: null`) outside any provider. */
export function useOverlayHost(): OverlayHost {
  return useContext(OverlayHostContext)
}

/**
 * Ref-counted inert state for a provider. `inert` is true while any acquisition is outstanding;
 * each release function counts once, however often it is called.
 */
export function useInertCount(): { inert: boolean; acquireInert: () => () => void } {
  const [count, setCount] = useState(0)
  const acquireInert = useCallback(() => {
    setCount((c) => c + 1)
    let released = false
    return () => {
      if (released) return
      released = true
      setCount((c) => c - 1)
    }
  }, [])
  return { inert: count > 0, acquireInert }
}
