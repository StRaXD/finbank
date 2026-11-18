import { z } from 'zod'
import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  AVATAR_SIZE_MESSAGE,
  AVATAR_TYPE_MESSAGE,
  isAvatarMimeType,
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
