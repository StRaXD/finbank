import { zodResolver } from '@hookform/resolvers/zod'
import type { FormEvent } from 'react'
import { useForm, type UseFormSetError } from 'react-hook-form'
import { useUpdateProfile } from '../../../api/hooks/useUpdateProfile.ts'
import { ApiError, type UserProfile } from '../../../api/types.ts'
import { Button } from '../../../ui/Button.tsx'
import { FormStatus } from '../../../ui/FormStatus.tsx'
import { PhoneInput } from '../../../ui/PhoneInput.tsx'
import { TextInput } from '../../../ui/TextInput.tsx'
import { profileSchema, type ProfileFormValues } from '../schemas.ts'

const genericErrorMessage = 'Something went wrong. Please try again.'
const savedMessage = 'Profile updated.'

const profileFields = ['fullName', 'email', 'username', 'phoneCountryCode', 'phoneNumber'] as const

function profileValues(profile: UserProfile): ProfileFormValues {
  const { fullName, email, username, phoneCountryCode, phoneNumber } = profile
  return { fullName, email, username, phoneCountryCode, phoneNumber }
}

/**
 * Maps a failed save onto the form: each adapter field error goes on its input; other field
 * messages (or the error's own message when none map) become the `root.server` alert.
 */
function showSubmitError(error: Error, setError: UseFormSetError<ProfileFormValues>) {
  const unmapped: string[] = []
  let mapped = 0
  if (error instanceof ApiError) {
    for (const [key, raw] of Object.entries(error.fieldErrors ?? {})) {
      const message = typeof raw === 'string' ? raw.trim() : ''
      if (!message) continue
      const field = profileFields.find((name) => name === key)
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
 * The Account tab's profile form (111. Settings.png): borderless Full name, Email, Username and
 * Phone Number, prefilled from the loaded profile, then "Update Profile". Saving goes through
 * `updateProfile`, whose `profile` invalidation refreshes the sidebar and the Overview greeting.
 */
export function ProfileForm({ profile }: { profile: UserProfile }) {
  const update = useUpdateProfile()
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileValues(profile),
  })

  const busy = update.isPending || isSubmitting

  const submitProfile = handleSubmit((values) => {
    update.mutate(values, {
      // Show what was stored (trimmed) and make it the form's new baseline.
      onSuccess: (saved) => reset(profileValues(saved)),
      onError: (error) => showSubmitError(error, setError),
    })
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (busy) {
      event.preventDefault()
      return
    }
    clearErrors()
    // A new attempt drops the previous confirmation.
    update.reset()
    void submitProfile(event)
  }

  const phoneError = [errors.phoneCountryCode?.message, errors.phoneNumber?.message].filter(Boolean).join(' ')
  const serverError = errors.root?.server?.message
  // After `reset(saved)` the form is clean, so a later edit hides the confirmation.
  const status = update.isSuccess && !isDirty ? savedMessage : undefined

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col">
      {/* Fields in the left ~40% column; Story 5.2 adds the profile picture column on the right. */}
      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="flex flex-col gap-6 lg:w-2/5">
          <TextInput
            label="Full name"
            variant="borderless"
            autoComplete="name"
            error={errors.fullName?.message}
            {...register('fullName')}
          />
          <TextInput
            label="Email"
            type="email"
            variant="borderless"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <TextInput
            label="Username"
            variant="borderless"
            autoComplete="username"
            error={errors.username?.message}
            {...register('username')}
          />
          <PhoneInput
            label="Phone Number"
            variant="borderless"
            codeProps={register('phoneCountryCode')}
            numberProps={register('phoneNumber')}
            error={phoneError || undefined}
          />
        </div>
      </div>

      {serverError && (
        <p role="alert" className="mt-6 text-14 text-danger">
          {serverError}
        </p>
      )}

      <div className={`${serverError ? 'mt-4' : 'mt-10'} w-48`}>
        <Button type="submit" fullWidth disabled={busy}>
          Update Profile
        </Button>
      </div>

      {/* Always mounted so the confirmation is announced; it takes no space while empty. */}
      <div className={status ? 'mt-4' : undefined}>
        <FormStatus message={status} />
      </div>
    </form>
  )
}
