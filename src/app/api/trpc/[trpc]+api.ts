import { appRouter } from '@/data/server/api/root'
import { createTRPCContext } from '@/data/server/api/trpc'
import { env } from '@/env'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

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
  const response = await fetchRequestHandler({
    endpoint: '/api/trpc',
    router: appRouter,
    req,
    createContext: () => createTRPCContext({ req }),
    onError({ error, path }) {
      console.error(`>>> tRPC Error on '${path}'`, error)
    }
  })

  setCorsHeaders(response)
  return response
}

export { handler as GET, handler as POST }
