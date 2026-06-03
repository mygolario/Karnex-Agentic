import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { handleGmailCallback } from '@/lib/integrations/oauth-handlers'

/** Legacy redirect URI — forwards to unified handler, then outreach on success */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/agents/outreach?gmail_error=${error}`
    )
  }

  const response = await handleGmailCallback(request, { legacyCallback: true })
  const location = response.headers.get('location')
  if (location?.includes('connected=gmail')) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/agents/outreach?gmail_connected=true`
    )
  }
  if (location?.includes('error=')) {
    const err = new URL(location).searchParams.get('error')
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/agents/outreach?gmail_error=${err ?? 'unknown'}`
    )
  }
  return response
}
