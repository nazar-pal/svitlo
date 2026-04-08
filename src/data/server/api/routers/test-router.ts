import { z } from 'zod'

import { publicProcedure } from '../orpc'

export const appTestRouter = {
  health: publicProcedure.handler(() => ({
    ok: true,
    service: 'svitlo-api',
    timestamp: new Date().toISOString()
  })),

  echo: publicProcedure
    .input(
      z.object({
        feature: z.string().optional(),
        status: z.string().optional()
      })
    )
    .handler(({ input }) => ({
      accepted: true,
      bodyEcho: {
        feature: input.feature ?? 'unknown',
        status: input.status ?? 'unspecified'
      }
    }))
}
