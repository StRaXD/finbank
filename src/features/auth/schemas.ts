import { z } from 'zod'

const email = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .pipe(z.email('Enter a valid email address.'))

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.'),
  persistent: z.boolean(),
})

export type LoginValues = z.infer<typeof loginSchema>
