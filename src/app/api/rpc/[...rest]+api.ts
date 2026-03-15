import { RPCHandler } from '@orpc/server/fetch'

import { appRouter } from '@/data/server/api/root'
import { db } from '@/data/server'
import { auth } from '@/data/server/auth'
import { env } from '@/env'

const rpcHandler = new RPCHandler(appRouter, {
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

const getAllowedOrigin = () => {
  if (process.env.NODE_ENV === 'production') {
    if (!env.BETTER_AUTH_URL)
      throw new Error(
        'BETTER_AUTH_URL must be set in production to determine allowed CORS origin'
      )

    return new URL(env.BETTER_AUTH_URL).origin
  }
  return '*'
}

const setCorsHeaders = (res: Response) => {
  res.headers.set('Access-Control-Allow-Origin', getAllowedOrigin())
  res.headers.set('Access-Control-Allow-Methods', 'OPTIONS, GET, POST')
  res.headers.set('Access-Control-Allow-Headers', '*')
}

export const OPTIONS = () => {
  const response = new Response(null, {
    status: 204
  })
  setCorsHeaders(response)
  return response
}

const handler = async (req: Request) => {
  const session = await auth.api.getSession({ headers: req.headers })

  const { matched, response } = await rpcHandler.handle(req, {
    prefix: '/api/rpc',
    context: { db, session, headers: req.headers }
  })

  if (matched) {
    setCorsHeaders(response)
    return response
  }

  return new Response('Not found', { status: 404 })
}

export { handler as GET, handler as POST }
