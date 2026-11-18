import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type FormEvent } from 'react'
import { useForm, type UseFormSetError } from 'react-hook-form'
import { useChangePassword } from '../../../api/hooks/useChangePassword.ts'
import { useProfile } from '../../../api/hooks/useProfile.ts'
import { ApiError } from '../../../api/types.ts'
import { Button } from '../../../ui/Button.tsx'
import { FormStatus } from '../../../ui/FormStatus.tsx'
import { PasswordInput } from '../../../ui/PasswordInput.tsx'
import { PhoneInput } from '../../../ui/PhoneInput.tsx'
import { passwordSchema, type PasswordFormValues } from '../schemas.ts'

const genericErrorMessage = 'Something went wrong. Please try again.'
const savedMessage = 'Password updated.'

const passwordFields = ['oldPassword', 'newPassword', 'confirmPassword'] as const

const emptyValues: PasswordFormValues = { oldPassword: '', newPassword: '', confirmPassword: '' }

/**
 * Maps a failed change onto the form: each adapter field error goes on its input; other field
 * messages (or the error's own message when none map) become the `root.server` alert. Only adapter
 * messages are shown, never a typed value.
 */
function showSubmitError(error: Error, setError: UseFormSetError<PasswordFormValues>) {
  const unmapped: string[] = []
  let mapped = 0
  if (error instanceof ApiError) {
    for (const [key, raw] of Object.entries(error.fieldErrors ?? {})) {
      const message = typeof raw === 'string' ? raw.trim() : ''
      if (!message) continue
      const field = passwordFields.find((name) => name === key)
      if (field) {
        setError(field, { message })
        mapped++
      } else {
        unmapped.push(message)
      }
    }
  }
  if (unmapped.length > 0) setError('root.server', { message: unmapped.join(' ') })
  else if (mapped === 0) setError('root.server', { message: error.message?.trim() || genericErrorMessage })
}

/**
 * The Security tab's password form (112. Settings.png): borderless masked Old, New and Retype
 * Password fields, the profile's phone shown read-only, then "Update Password". Saving goes
 * through `changePassword`, which changes no cached data: the session and the profile stay as
 * they are. The phone is never sent. The form does not wait for the profile: the phone fills in
 * once it loads (and stays empty if it fails).
 */
export function PasswordForm() {
  const change = useChangePassword()
  const profile = useProfile()
  // Whether the last change succeeded; any edit hides the confirmation again.
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: emptyValues,
  })

  const busy = change.isPending || isSubmitting

  const submitPassword = handleSubmit((values) => {
    change.mutate(values, {
      onSuccess: () => {
        reset(emptyValues)
        setSaved(true)
      },
      // A failure keeps the typed values so the user can fix and retry.
      onError: (error) => showSubmitError(error, setError),
      // `reset` detaches the observer; with useChangePassword's `gcTime: 0` the unobserved mutation
      // (and the passwords in its `variables`) is then garbage-collected at once.
      onSettled: () => change.reset(),
    })
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (busy) {
      event.preventDefault()
      return
    }
    clearErrors()
    // A new attempt drops the previous confirmation.
    setSaved(false)
    void submitPassword(event)
  }

  const serverError = errors.root?.server?.message
  const status = saved ? savedMessage : undefined

  return (
    // `onChange` bubbles from every input: an edit after a success hides the confirmation.
    <form noValidate onSubmit={onSubmit} onChange={() => setSaved(false)} className="flex flex-col">
      <div className="flex flex-col gap-5 lg:w-2/5">
        <PasswordInput
          label="Old Password"
          variant="borderless"
          autoComplete="current-password"
          error={errors.oldPassword?.message}
          {...register('oldPassword')}
        />
        <PasswordInput
          label="New Password"
          variant="borderless"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <PasswordInput
          label="Retype Password"
          variant="borderless"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        {/* Read-only (still focusable), from the profile; never registered, so never sent. */}
        <PhoneInput
          label="Phone Number"
          variant="borderless"
          codeProps={{ readOnly: true, value: profile.data?.phoneCountryCode ?? '' }}
          numberProps={{ readOnly: true, value: profile.data?.phoneNumber ?? '' }}
        />
      </div>

      {serverError && (
        <p role="alert" className="mt-6 text-14 text-danger">
          {serverError}
        </p>
      )}

      <div className={`${serverError ? 'mt-4' : 'mt-11'} w-48`}>
        <Button type="submit" fullWidth disabled={busy}>
          Update Password
        </Button>
      </div>

      {/* Always mounted so the confirmation is announced; it takes no space while empty. */}
      <div className={status ? 'mt-4' : undefined}>
        <FormStatus message={status} />
      </div>
    </form>
  )
}
