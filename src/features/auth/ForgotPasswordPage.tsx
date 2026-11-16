import { zodResolver } from '@hookform/resolvers/zod'
import type { FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { useRequestPasswordReset } from '../../api/hooks/useRequestPasswordReset.ts'
import type { ApiError } from '../../api/types.ts'
import { Button } from '../../ui/Button.tsx'
import { FormStatus } from '../../ui/FormStatus.tsx'
import { TextInput } from '../../ui/TextInput.tsx'
import { applyApiError } from './applyApiError.ts'
import { AuthLayout } from './components/AuthLayout.tsx'
import type { AuthPaths } from './paths.ts'
import { forgotPasswordSchema, type ForgotPasswordValues } from './schemas.ts'

const resetFields = ['email'] as const

const sentMessage = 'Check your email for a password reset link.'

/** Password-reset request. On success the form stays in place with an inline confirmation. */
export function ForgotPasswordPage({ paths }: { paths: AuthPaths }) {
  const reset = useRequestPasswordReset()
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const busy = reset.isPending || isSubmitting

  const showSubmitError = (error: ApiError) => applyApiError(error, resetFields, setError)

  const submitReset = handleSubmit(({ email }) => {
    reset.mutate(email, { onError: showSubmitError })
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (busy) {
      event.preventDefault()
      return
    }
    clearErrors()
    // A new attempt drops the previous confirmation.
    reset.reset()
    void submitReset(event)
  }

  const status = reset.isSuccess ? sentMessage : undefined

  return (
    <AuthLayout
      title="Forgot Password?"
      showTitle
      subtitle="Enter your email address to get the password reset link."
      placement="low"
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col">
        <TextInput
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="hello@example.com"
          error={errors.email?.message}
          {...register('email', {
            // The confirmation names no address, so it must not outlive an edit to the email.
            onChange: () => {
              if (reset.isSuccess) reset.reset()
            },
          })}
        />

        {errors.root?.server && (
          <p role="alert" className="mt-4 text-14 text-danger">
            {errors.root.server.message}
          </p>
        )}

        <div className={errors.root?.server ? 'mt-4' : 'mt-8'}>
          <Button type="submit" fullWidth disabled={busy}>
            Password Reset
          </Button>
        </div>

        {/* Always mounted so the confirmation is announced; it takes no space while empty. */}
        <div className={status ? 'mt-4 text-center' : 'text-center'}>
          <FormStatus message={status} />
        </div>
      </form>

      <div className="mt-6 flex justify-center">
        <Link to={paths.login} className="rounded-button text-16 font-semibold text-subtle hover:underline">
          Back to login
        </Link>
      </div>
    </AuthLayout>
  )
}
