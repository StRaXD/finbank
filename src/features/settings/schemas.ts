import { z } from 'zod'

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
