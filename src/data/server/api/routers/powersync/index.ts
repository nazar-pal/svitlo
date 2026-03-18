import { NeonDbError } from '@neondatabase/serverless'
import { SignJWT } from 'jose'
import { z } from 'zod'

import { env } from '@/env'

import { protectedProcedure } from '../../orpc'
import {
  handleGeneratorSessions,
  handleGeneratorUserAssignments,
  handleGenerators,
  handleInvitations,
  handleMaintenanceRecords,
  handleMaintenanceTemplates,
  handleOrganizationMembers,
  handleOrganizations,
  handleUser,
  type WriteContext
} from './handlers'

const SECRET = new TextEncoder().encode(env.POWERSYNC_PRIVATE_KEY)

// Short-lived token — PowerSync SDK auto-refreshes via fetchCredentials
const TOKEN_LIFETIME_SECONDS = 5 * 60

interface SyncRejection {
  code: string
  message: string
  constraint?: string
  table: string
}

/**
 * Postgres error codes that indicate a data/constraint rejection (not a bug).
 * 22xxx = data exception, 23xxx = integrity constraint violation, P0001 = raise_exception (triggers)
 */
function isConstraintError(error: unknown): error is NeonDbError {
  if (!(error instanceof NeonDbError) || !error.code) return false
  return (
    error.code.startsWith('22') ||
    error.code.startsWith('23') ||
    error.code === 'P0001'
  )
}

export const powersyncRouter = {
  token: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = now + TOKEN_LIFETIME_SECONDS

    const token = await new SignJWT({ sub: userId, iat: now, exp: expiresAt })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT', kid: 'svitlo-dev-1' })
      .setAudience(env.POWERSYNC_URL)
      .sign(SECRET)

    return {
      token,
      endpoint: env.POWERSYNC_URL,
      expiresAt: new Date(expiresAt * 1000).toISOString()
    }
  }),

  applyWrite: protectedProcedure
    .input(
      z.object({
        table: z.string(),
        op: z.enum(['insert', 'update', 'delete']),
        id: z.string(),
        data: z.record(z.string(), z.unknown()).optional()
      })
    )
    .handler(async ({ context, input }) => {
      // PowerSync requires 2xx responses — never throw, return error flags.
      // Data validation is handled client-side (Zod) and by DB constraints.
      // This handler only enforces authorization and passes data through.
      const wctx: WriteContext = {
        db: context.db,
        userId: context.session.user.id,
        userEmail: context.session.user.email,
        op: input.op,
        id: input.id,
        data: input.data ?? {}
      }

      try {
        switch (input.table) {
          case 'user':
            return handleUser(wctx)
          case 'organizations':
            return handleOrganizations(wctx)
          case 'organization_members':
            return handleOrganizationMembers(wctx)
          case 'invitations':
            return handleInvitations(wctx)
          case 'generators':
            return handleGenerators(wctx)
          case 'generator_user_assignments':
            return handleGeneratorUserAssignments(wctx)
          case 'generator_sessions':
            return handleGeneratorSessions(wctx)
          case 'maintenance_templates':
            return handleMaintenanceTemplates(wctx)
          case 'maintenance_records':
            return handleMaintenanceRecords(wctx)
          default:
            return {
              ok: false as const,
              error: `Unhandled table: ${input.table}`
            }
        }
      } catch (error) {
        // Constraint/trigger violations are expected rejections (not bugs).
        // Return structured info so the connector can log them with context.
        if (isConstraintError(error)) {
          const rejection: SyncRejection = {
            code: error.code!,
            message: error.message,
            constraint: error.constraint,
            table: input.table
          }
          return { ok: false as const, rejection }
        }

        // Unexpected errors — log server-side, return generic message
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error(
          `[applyWrite] ${input.table}.${input.op} failed:`,
          message
        )
        return { ok: false as const, error: message }
      }
    })
}
