import { auth } from '@/data/server/auth'

const handler = auth.handler
export { handler as GET, handler as POST }
