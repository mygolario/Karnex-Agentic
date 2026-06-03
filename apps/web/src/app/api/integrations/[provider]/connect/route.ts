import { NextResponse } from 'next/server'
import { isSupportedOAuthProvider } from '@/lib/integrations/oauth'
import {
  startGmailConnect,
  startGithubConnect,
} from '@/lib/integrations/oauth-handlers'

type RouteContext = { params: Promise<{ provider: string }> }

export async function POST(
  _request: Request,
  context: RouteContext
): Promise<NextResponse> {
  const { provider } = await context.params

  if (!isSupportedOAuthProvider(provider)) {
    return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
  }

  if (provider === 'gmail') return startGmailConnect()
  return startGithubConnect()
}

export async function GET(
  _request: Request,
  context: RouteContext
): Promise<NextResponse> {
  return POST(_request, context)
}
