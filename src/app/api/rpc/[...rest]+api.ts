import { RPCHandler } from '@orpc/server/fetch'
import { CORSPlugin } from '@orpc/server/plugins'

import { appRouter } from '@/data/server/api/root'
import { db } from '@/data/server'
import { auth } from '@/data/server/auth'
import { env } from '@/env'

const rpcHandler = new RPCHandler(appRouter, {
  plugins: [
    new CORSPlugin({
      origin:
        process.env.NODE_ENV === 'production'
          ? new URL(env.BETTER_AUTH_URL!).origin
          : '*',
      allowMethods: ['GET', 'POST']
    })
  ],
  clientInterceptors: [
    async options => {
      try {
        return await options.next()
      } catch (error) {
        console.error(`>>> RPC Error on '${options.path.join('.')}'`, error)
        throw error
      }
    }
  ]
})

const handler = async (req: Request) => {
  const session = await auth.api.getSession({ headers: req.headers })

  const { matched, response } = await rpcHandler.handle(req, {
    prefix: '/api/rpc',
    context: { db, session, headers: req.headers }
  })

  if (matched) return response

  return new Response('Not found', { status: 404 })
}

export { handler as GET, handler as POST, handler as OPTIONS }
