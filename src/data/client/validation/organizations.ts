import { z } from 'zod'

import { zNonEmptyString } from './helpers'

export const insertOrganizationSchema = z.object({
  name: zNonEmptyString
})

export type InsertOrganizationInput = z.input<typeof insertOrganizationSchema>

export const insertInvitationSchema = z.object({
  organizationId: z.string(),
  inviteeEmail: z.string().email({ error: 'Must be a valid email address' })
})

export type InsertInvitationInput = z.input<typeof insertInvitationSchema>
