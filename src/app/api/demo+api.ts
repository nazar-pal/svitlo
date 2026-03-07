export function GET(request: Request) {
  const url = new URL(request.url)
  const name = url.searchParams.get('name') ?? 'guest'

  return Response.json({
    message: `Hello, ${name}!`,
    queryEcho: {
      name
    }
  })
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    feature?: string
    status?: string
  }

  return Response.json({
    accepted: true,
    bodyEcho: {
      feature: body.feature ?? 'unknown',
      status: body.status ?? 'unspecified'
    }
  })
}
