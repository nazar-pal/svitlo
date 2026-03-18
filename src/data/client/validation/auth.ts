import { z } from 'zod'

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: 'Please enter your email' })
    .email({ error: 'Please enter a valid email' }),
  password: z.string().min(1, { error: 'Please enter your password' })
})

export const signUpSchema = z
  .object({
    name: z.string().trim().min(1, { error: 'Please enter your name' }),
    email: z
      .string()
      .trim()
      .min(1, { error: 'Please enter your email' })
      .email({ error: 'Please enter a valid email' }),
    password: z
      .string()
      .min(8, { error: 'Password must be at least 8 characters' }),
    confirmPassword: z.string()
  })
  .refine(d => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match'
  })
