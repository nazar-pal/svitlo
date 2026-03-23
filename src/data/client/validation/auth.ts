import { z } from 'zod'

import { t } from '@/lib/i18n'

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: () => t('validation.enterEmail') })
    .email({ error: () => t('validation.validEmail') }),
  password: z.string().min(1, { error: () => t('validation.enterPassword') })
})

export const completeNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: () => t('validation.enterName') })
})

export const signUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: () => t('validation.enterName') }),
    email: z
      .string()
      .trim()
      .min(1, { error: () => t('validation.enterEmail') })
      .email({ error: () => t('validation.validEmail') }),
    password: z
      .string()
      .min(8, { error: () => t('validation.passwordMinLength') }),
    confirmPassword: z.string()
  })
  .refine(d => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    error: () => t('validation.passwordsDoNotMatch')
  })
