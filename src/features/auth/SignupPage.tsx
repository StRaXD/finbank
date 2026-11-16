import { zodResolver } from '@hookform/resolvers/zod'
import type { FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { useLoginWithGoogle } from '../../api/hooks/useLoginWithGoogle.ts'
import { useSignup } from '../../api/hooks/useSignup.ts'
import type { ApiError } from '../../api/types.ts'
import { Button } from '../../ui/Button.tsx'
import { PasswordInput } from '../../ui/PasswordInput.tsx'
import { TextInput } from '../../ui/TextInput.tsx'
import { alertMessage, applyApiError } from './applyApiError.ts'
import { AuthLayout } from './components/AuthLayout.tsx'
import { OrDivider } from './components/OrDivider.tsx'
import { linkClass } from './linkClass.ts'
import type { AuthPaths } from './paths.ts'
import { signupSchema, type SignupValues } from './schemas.ts'

// name/email/password errors go to their inputs; anything else goes to the alert above Sign up.
const signupFields = ['name', 'email', 'password'] as const

/**
 * Account creation screen. Like Login, success seeds the session and the public-route guard
 * redirects to Overview, so this page never navigates itself.
 */
export function SignupPage({ paths }: { paths: AuthPaths }) {
  const signup = useSignup()
  const google = useLoginWithGoogle()
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '' },
  })

  const busy = signup.isPending || google.isPending || isSubmitting

  const showSubmitError = (error: ApiError) => applyApiError(error, signupFields, setError)

  const submitSignup = handleSubmit((values) => {
    signup.mutate(values, { onError: showSubmitError })
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (busy) {
      event.preventDefault()
      return
    }
    clearErrors()
    void submitSignup(event)
  }

  const onGoogle = () => {
    if (busy) return
    clearErrors()
    google.mutate(undefined, {
      onError: (error) => setError('root.server', { message: alertMessage(error) }),
    })
  }

  return (
    <AuthLayout title="Create an account" showTitle placement="high">
      <form noValidate onSubmit={onSubmit} className="flex flex-col">
        <TextInput
          label="Name"
          autoComplete="name"
          placeholder="Tanzir Rahman"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="mt-6">
          <TextInput
            label="Email Address"
            type="email"
            autoComplete="email"
            placeholder="hello@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        <div className="mt-6">
          <PasswordInput
            label="Password"
            autoComplete="new-password"
            placeholder="••••••••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        {/* "terms of service." is inert by design: there is no terms page. */}
        <p className="mt-8 text-14 text-ink-2">
          By continuing, you agree to our{' '}
          <button type="button" aria-disabled="true" className="cursor-pointer rounded-button text-primary hover:underline">
            terms of service.
          </button>
        </p>

        {errors.root?.server && (
          <p role="alert" className="mt-4 text-14 text-danger">
            {errors.root.server.message}
          </p>
        )}

        <div className={errors.root?.server ? 'mt-4' : 'mt-5'}>
          <Button type="submit" fullWidth disabled={busy}>
            Sign up
          </Button>
        </div>
      </form>

      <div className="mt-8">
        <OrDivider label="or sign up with" />
      </div>

      <div className="mt-8">
        <Button variant="google" fullWidth disabled={busy} onClick={onGoogle}>
          Continue with Google
        </Button>
      </div>

      {/* `faint`, not `muted`: the PNG's grey here is much lighter than `muted`, which `faint` matches. */}
      <p className="mt-10 text-center text-16 text-faint">
        Already have an account?{' '}
        <Link to={paths.login} className={linkClass}>
          Sign in here
        </Link>
      </p>
    </AuthLayout>
  )
}
