import { z } from 'zod'
import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  AVATAR_SIZE_MESSAGE,
  AVATAR_TYPE_MESSAGE,
  CONFIRM_PASSWORD_MISMATCH_MESSAGE,
  CONFIRM_PASSWORD_REQUIRED_MESSAGE,
  isAvatarMimeType,
  NEW_PASSWORD_LENGTH_MESSAGE,
  NEW_PASSWORD_REQUIRED_MESSAGE,
  OLD_PASSWORD_REQUIRED_MESSAGE,
  PASSWORD_MIN_LENGTH,
} from '../../api/types.ts'

const required = (message: string) => z.string().trim().min(1, message)

/** The Account tab's profile form. Every field is required; the email must be well formed. */
export const profileSchema = z.object({
  fullName: required('Full name is required.'),
  email: z.string().trim().min(1, 'Email is required.').pipe(z.email('Enter a valid email address.')),
  username: required('Username is required.'),
  phoneCountryCode: required('Country code is required.'),
  phoneNumber: required('Phone number is required.'),
})

export type ProfileFormValues = z.infer<typeof profileSchema>

/** The profile photo picker's `accept`: the image types the adapter stores. */
export const avatarAccept = AVATAR_MIME_TYPES.join(',')

/** Why a picked photo cannot be used (wrong type or over 5 MB), or `undefined` when it can. */
export function avatarPickError(file: File): string | undefined {
  if (!isAvatarMimeType(file.type)) return AVATAR_TYPE_MESSAGE
  if (file.size > AVATAR_MAX_BYTES) return AVATAR_SIZE_MESSAGE
  return undefined
}

/**
 * The Security tab's password form: the adapter's rules and messages. Passwords are never trimmed;
 * a mismatch is reported on `confirmPassword`, only once both are filled in (a blank
 * New Password shows just its own required message).
 */
export const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, OLD_PASSWORD_REQUIRED_MESSAGE),
    newPassword: z
      .string()
      .min(1, NEW_PASSWORD_REQUIRED_MESSAGE)
      .min(PASSWORD_MIN_LENGTH, NEW_PASSWORD_LENGTH_MESSAGE),
    confirmPassword: z.string().min(1, CONFIRM_PASSWORD_REQUIRED_MESSAGE),
  })
  .superRefine((values, ctx) => {
    if (values.newPassword !== '' && values.confirmPassword !== '' && values.confirmPassword !== values.newPassword) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: CONFIRM_PASSWORD_MISMATCH_MESSAGE })
    }
  })

export type PasswordFormValues = z.infer<typeof passwordSchema>
