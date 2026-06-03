import { NextResponse } from 'next/server'
import { isSupportedOAuthProvider } from '@/lib/integrations/oauth'
import {
  handleGmailCallback,
  handleGithubCallback,
} from '@/lib/integrations/oauth-handlers'

type RouteContext = { params: Promise<{ provider: string }> }

export async function GET(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  const { provider } = await context.params

  if (!isSupportedOAuthProvider(provider)) {
    return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
  }

  if (provider === 'gmail') return handleGmailCallback(request)
  return handleGithubCallback(request)
}
