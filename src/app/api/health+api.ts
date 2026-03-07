export function GET() {
  return Response.json({
    ok: true,
    service: 'svitlo-api',
    timestamp: new Date().toISOString()
  })
}
