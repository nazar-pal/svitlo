import { z } from 'zod'

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: 'ENTER_EMAIL' })
    .email({ error: 'VALID_EMAIL' }),
  password: z.string().min(1, { error: 'ENTER_PASSWORD' })
})

export const completeNameSchema = z.object({
  name: z.string().trim().min(1, { error: 'ENTER_NAME' })
})

export const signUpSchema = z
  .object({
    name: z.string().trim().min(1, { error: 'ENTER_NAME' }),
    email: z
      .string()
      .trim()
      .min(1, { error: 'ENTER_EMAIL' })
      .email({ error: 'VALID_EMAIL' }),
    password: z.string().min(8, { error: 'PASSWORD_MIN_LENGTH' }),
    confirmPassword: z.string()
  })
  .refine(d => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    error: 'PASSWORDS_DO_NOT_MATCH'
  })
