import { z } from 'zod'

const email = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .pipe(z.email('Enter a valid email address.'))

const password = z.string().min(1, 'Password is required.')

export const loginSchema = z.object({
  email,
  password,
  persistent: z.boolean(),
})

export type LoginValues = z.infer<typeof loginSchema>

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  email,
  password,
})

export type SignupValues = z.infer<typeof signupSchema>

export const forgotPasswordSchema = z.object({ email })

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
