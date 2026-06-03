import { NextResponse } from 'next/server'
import { startGmailConnect } from '@/lib/integrations/oauth-handlers'

/** @deprecated Use POST /api/integrations/gmail/connect */
export async function GET(): Promise<NextResponse> {
  return startGmailConnect({ legacyCallback: true })
}
