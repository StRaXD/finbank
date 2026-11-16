/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Which `FinbankApi` adapter `app/providers.tsx` composes. Unset or empty means `mock`. */
  readonly VITE_API_MODE?: 'mock' | 'http'
  /** Base URL of the external API, used only when `VITE_API_MODE` is `http`. */
  readonly VITE_API_BASE_URL?: string
}
