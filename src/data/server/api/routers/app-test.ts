import { z } from 'zod'

import { createTRPCRouter, publicProcedure } from '../trpc'

export const appTestRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({
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
    .mutation(({ input }) => ({
      accepted: true,
      bodyEcho: {
        feature: input.feature ?? 'unknown',
        status: input.status ?? 'unspecified'
      }
    }))
})
