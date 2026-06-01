import { NextRequest, NextResponse } from 'next/server'

function getAgentServiceBaseUrl(): string {
  const raw =
    process.env.AGENT_SERVICE_URL ||
    process.env.NEXT_PUBLIC_AGENT_SERVICE_URL ||
    'http://localhost:8000'
  return raw.replace(/\/$/, '')
}

async function proxyAgentRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await context.params
  const targetPath = path.join('/')
  const search = request.nextUrl.search
  const url = `${getAgentServiceBaseUrl()}/${targetPath}${search}`

  const headers = new Headers()
  const authorization = request.headers.get('authorization')
  if (authorization) {
    headers.set('authorization', authorization)
  }
  const contentType = request.headers.get('content-type')
  if (contentType) {
    headers.set('content-type', contentType)
  }

  const init: RequestInit = {
    method: request.method,
    headers,
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text()
  }

  let upstream: Response
  try {
    upstream = await fetch(url, init)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Agent service unreachable'
    return NextResponse.json(
      { detail: `Agent service unreachable (${message}). Check AGENT_SERVICE_URL.` },
      { status: 502 }
    )
  }

  const responseHeaders = new Headers()
  const upstreamContentType = upstream.headers.get('content-type')
  if (upstreamContentType) {
    responseHeaders.set('content-type', upstreamContentType)
  }

  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: responseHeaders,
  })
}

export const GET = proxyAgentRequest
export const POST = proxyAgentRequest
export const PUT = proxyAgentRequest
export const PATCH = proxyAgentRequest
export const DELETE = proxyAgentRequest
