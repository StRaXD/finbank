import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState, type FormEvent } from 'react'
import { useForm, type UseFormSetError } from 'react-hook-form'
import { useUpdateProfile } from '../../../api/hooks/useUpdateProfile.ts'
import { ApiError, type UserProfile } from '../../../api/types.ts'
import { Button } from '../../../ui/Button.tsx'
import { FormStatus } from '../../../ui/FormStatus.tsx'
import { ImageUpload } from '../../../ui/ImageUpload.tsx'
import { PhoneInput } from '../../../ui/PhoneInput.tsx'
import { TextInput } from '../../../ui/TextInput.tsx'
import { avatarAccept, avatarPickError, profileSchema, type ProfileFormValues } from '../schemas.ts'

const genericErrorMessage = 'Something went wrong. Please try again.'
const savedMessage = 'Profile updated.'

const profileFields = ['fullName', 'email', 'username', 'phoneCountryCode', 'phoneNumber'] as const

function profileValues(profile: UserProfile): ProfileFormValues {
  const { fullName, email, username, phoneCountryCode, phoneNumber } = profile
  return { fullName, email, username, phoneCountryCode, phoneNumber }
}

/**
 * Maps a failed save onto the form: each adapter field error goes on its input, `avatar` under the
 * photo box; other field messages (or the error's own message when none map) become the
 * `root.server` alert.
 */
function showSubmitError(
  error: Error,
  setError: UseFormSetError<ProfileFormValues>,
  setAvatarError: (message: string) => void,
) {
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
      } else if (key === 'avatar') {
        setAvatarError(message)
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
 * A picked photo and the object URL previewing it. `savedAs` is set once "Update Profile" stored
 * it: the stored `avatarUrl` the refetched profile is awaited to show.
 */
type PendingAvatar = { file: File; url: string; savedAs?: string | null }

/**
 * The Account tab's profile form (111. Settings.png): borderless Full name, Email, Username and
 * Phone Number, prefilled from the loaded profile, the "Your Profile Picture" upload box, then
 * "Update Profile". Saving goes through `updateProfile` (with the picked photo, if any), whose
 * `profile` invalidation refreshes the sidebar and the Overview greeting.
 */
export function ProfileForm({ profile }: { profile: UserProfile }) {
  const update = useUpdateProfile()
  // The picked photo waiting for "Update Profile"; it is never stored on pick.
  const [pendingAvatar, setPendingAvatar] = useState<PendingAvatar | null>(null)
  const [avatarError, setAvatarError] = useState<string | undefined>()
  const previewUrl = pendingAvatar?.url
  const saved = pendingAvatar !== null && pendingAvatar.savedAs !== undefined
  // A saved pick is dropped once the profile shows the stored avatar (adjusting state during
  // render), so the box goes straight from the preview to the saved photo, without a flash of the
  // previous one while the profile refetches.
  if (saved && profile.avatarUrl === pendingAvatar.savedAs) setPendingAvatar(null)
  // The pick still to send with the next save.
  const unsavedAvatar = saved ? null : pendingAvatar

  // Each preview URL is revoked once it is replaced or cleared, and on unmount.
  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

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

  const selectAvatar = (file: File) => {
    const error = avatarPickError(file)
    // An invalid pick keeps whatever the box showed before.
    setAvatarError(error)
    if (!error) setPendingAvatar({ file, url: URL.createObjectURL(file) })
  }

  const submitProfile = handleSubmit((values) => {
    const avatar = unsavedAvatar
    update.mutate(avatar ? { ...values, avatar: avatar.file } : values, {
      onSuccess: (stored) => {
        // Show what was stored (trimmed) and make it the form's new baseline.
        reset(profileValues(stored))
        // The pick is cleared once the profile shows it, unless another photo was picked meanwhile.
        if (avatar) {
          setPendingAvatar((current) => (current === avatar ? { ...current, savedAs: stored.avatarUrl } : current))
        }
      },
      // A failure keeps the pending photo so the user can retry.
      onError: (error) => showSubmitError(error, setError, setAvatarError),
    })
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (busy) {
      event.preventDefault()
      return
    }
    clearErrors()
    setAvatarError(undefined)
    // A new attempt drops the previous confirmation.
    update.reset()
    void submitProfile(event)
  }

  const phoneError = [errors.phoneCountryCode?.message, errors.phoneNumber?.message].filter(Boolean).join(' ')
  const serverError = errors.root?.server?.message
  // After `reset(saved)` the form is clean, so a later edit hides the confirmation.
  const status = update.isSuccess && !isDirty && !unsavedAvatar ? savedMessage : undefined

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col">
      {/* Fields in the left ~40% column, the profile picture in the right one. */}
      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="flex flex-col gap-5 lg:w-2/5">
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
        <div className="lg:ml-auto lg:w-89">
          <ImageUpload
            label="Your Profile Picture"
            imageUrl={previewUrl ?? profile.avatarUrl}
            onSelect={selectAvatar}
            error={avatarError}
            accept={avatarAccept}
          />
        </div>
      </div>

      {serverError && (
        <p role="alert" className="mt-6 text-14 text-danger">
          {serverError}
        </p>
      )}

      <div className={`${serverError ? 'mt-4' : 'mt-11'} w-48`}>
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
