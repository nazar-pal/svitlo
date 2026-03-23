import { Resend } from 'resend'
import { z } from 'zod'

import { env } from '@/env'

const resend = new Resend(env.RESEND_API_KEY)

const schema = z.object({
  email: z.email(),
  locale: z.enum(['en', 'uk']).optional()
})

const WINDOW_MS = 60_000
const MAX_REQUESTS = 5
const requests = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = requests.get(ip)?.filter(t => now - t < WINDOW_MS) ?? []
  if (timestamps.length >= MAX_REQUESTS) return true
  timestamps.push(now)
  requests.set(ip, timestamps)
  return false
}

export async function POST(req: Request) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip))
    return Response.json({ error: 'Too many requests' }, { status: 429 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)

  if (!parsed.success)
    return Response.json({ error: 'Invalid email' }, { status: 400 })

  const { email, locale } = parsed.data

  const createPayload = {
    email,
    unsubscribed: false,
    segments: [{ id: env.RESEND_WAITLIST_SEGMENT_ID }]
  }

  let { error } = await resend.contacts.create({
    ...createPayload,
    properties: locale ? { locale } : undefined
  })

  // Retry without properties if they don't exist in Resend yet
  if (error?.statusCode === 422)
    ({ error } = await resend.contacts.create(createPayload))

  if (error && error.statusCode !== 409)
    return Response.json({ error: 'Internal server error' }, { status: 500 })

  return Response.json({ ok: true })
}
