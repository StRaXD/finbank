/**
 * The auth screens' link targets. Paths are owned by `src/app/routes.ts`, which features may
 * not import, so the route table passes them in. The post-sign-in redirect is not here: the
 * app's public-route guard owns it.
 */
export type AuthPaths = {
  login: string
  signup: string
  forgotPassword: string
}
