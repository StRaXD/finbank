import { zodResolver } from '@hookform/resolvers/zod'
import type { FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { useLogin } from '../../api/hooks/useLogin.ts'
import { useLoginWithGoogle } from '../../api/hooks/useLoginWithGoogle.ts'
import type { ApiError } from '../../api/types.ts'
import { Button } from '../../ui/Button.tsx'
import { Checkbox } from '../../ui/Checkbox.tsx'
import { PasswordInput } from '../../ui/PasswordInput.tsx'
import { TextInput } from '../../ui/TextInput.tsx'
import { alertMessage, applyApiError } from './applyApiError.ts'
import { AuthLayout } from './components/AuthLayout.tsx'
import { OrDivider } from './components/OrDivider.tsx'
import { linkClass } from './linkClass.ts'
import type { AuthPaths } from './paths.ts'
import { loginSchema, type LoginValues } from './schemas.ts'

// email/password errors go to their inputs; anything else goes to the alert above the Login button.
const loginFields = ['email', 'password'] as const

/**
 * Sign-in screen. On success the session query is seeded with the new session and the
 * public-route guard redirects to Overview, so this page never navigates itself.
 */
export function LoginPage({ paths }: { paths: AuthPaths }) {
  const login = useLogin()
  const google = useLoginWithGoogle()
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', persistent: true },
  })

  const busy = login.isPending || google.isPending || isSubmitting

  const showSubmitError = (error: ApiError) => applyApiError(error, loginFields, setError)

  const submitLogin = handleSubmit((values) => {
    login.mutate(values, { onError: showSubmitError })
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (busy) {
      event.preventDefault()
      return
    }
    clearErrors()
    void submitLogin(event)
  }

  const onGoogle = () => {
    if (busy) return
    clearErrors()
    // Google honours "Keep me signed in" just like the email/password login.
    google.mutate({ persistent: getValues('persistent') }, {
      onError: (error) => setError('root.server', { message: alertMessage(error) }),
    })
  }

  return (
    <AuthLayout title="Log in">
      <form noValidate onSubmit={onSubmit} className="flex flex-col">
        <TextInput
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="johndoe@email.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="relative mt-6">
          {/* On the label row, and before the input in the DOM so tab order follows the layout. */}
          <Link to={paths.forgotPassword} className={`absolute top-1 right-0 text-12 ${linkClass}`}>
            Forgot Password?
          </Link>
          <PasswordInput
            label="Password"
            autoComplete="current-password"
            placeholder="••••••••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <div className="mt-8">
          <Checkbox label="Keep me signed in" {...register('persistent')} />
        </div>

        {errors.root?.server && (
          <p role="alert" className="mt-4 text-14 text-danger">
            {errors.root.server.message}
          </p>
        )}

        <div className="mt-4">
          <Button type="submit" fullWidth disabled={busy}>
            Login
          </Button>
        </div>
      </form>

      <div className="mt-8">
        <OrDivider label="or sign in with" />
      </div>

      <div className="mt-8">
        <Button variant="google" fullWidth disabled={busy} onClick={onGoogle}>
          Continue with Google
        </Button>
      </div>

      <div className="mt-10 flex justify-center">
        <Link to={paths.signup} className={`text-16 ${linkClass}`}>
          Create an account
        </Link>
      </div>
    </AuthLayout>
  )
}
