import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'
import { z } from 'zod'
import crypto from 'crypto'

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  scope: z.string().optional(),
})

const userInfoSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
})

function encryptToken(plaintext: string, secretKey: string): string {
  if (!plaintext) return ''
  const key = crypto.scryptSync(secretKey, 'karnex-salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const raw = Buffer.concat([iv, Buffer.from(encrypted, 'hex')])
  return raw.toString('base64url')
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  
  const REDIRECT_BASE = `${env.NEXT_PUBLIC_APP_URL}/agents/outreach`
  const cookieStore = await cookies()
  const savedState = cookieStore.get('gmail_oauth_state')?.value
  
  // Clear the state cookie regardless of outcome
  cookieStore.delete('gmail_oauth_state')

  // 1. Handle OAuth error from Google
  if (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(`${REDIRECT_BASE}?gmail_error=access_denied`)
  }

  // 2. Verify state param matches cookie value (CSRF protection)
  if (!state || !savedState || state !== savedState) {
    console.error('State token mismatch. CSRF validation failed.')
    return NextResponse.redirect(`${REDIRECT_BASE}?gmail_error=invalid_state`)
  }

  if (!code) {
    return NextResponse.redirect(`${REDIRECT_BASE}?gmail_error=missing_code`)
  }

  // 3. Verify authenticated Supabase session
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${REDIRECT_BASE}?gmail_error=unauthorized`)
  }

  try {
    // 4. Exchange code for tokens
    const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback/gmail`
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: env.GMAIL_CLIENT_ID,
        client_secret: env.GMAIL_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text()
      console.error('Failed to exchange Google code:', errText)
      return NextResponse.redirect(`${REDIRECT_BASE}?gmail_error=token_exchange_failed`)
    }

    const rawTokenData = await tokenResponse.json()
    const parsedToken = tokenResponseSchema.safeParse(rawTokenData)
    if (!parsedToken.success) {
      console.error('Token validation failed:', parsedToken.error)
      return NextResponse.redirect(`${REDIRECT_BASE}?gmail_error=token_exchange_failed`)
    }

    const { access_token, refresh_token, expires_in, scope } = parsedToken.data

    // 5. Fetch user's Gmail address for display using Gmail Profile endpoint (doesn't require extra email scope)
    const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    let email = 'unknown@gmail.com'
    let name = 'Gmail User'

    if (profileResponse.ok) {
      const rawProfile = await profileResponse.json()
      const parsedProfile = z.object({
        emailAddress: z.string().email(),
      }).safeParse(rawProfile)
      
      if (parsedProfile.success) {
        email = parsedProfile.data.emailAddress
        name = email.split('@')[0]
      }
    } else {
      console.warn('Failed to fetch Gmail profile from Google')
    }

    // 6. Encrypt tokens using Node.js crypto (AES-256-CBC)
    const encryptedAccess = encryptToken(access_token, env.ENCRYPTION_KEY)
    
    // Google only sends refresh token on first consent prompt. If not returned in response,
    // we keep the previous encrypted refresh token in database (using a check).
    const encryptedRefresh = refresh_token ? encryptToken(refresh_token, env.ENCRYPTION_KEY) : null

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()
    const scopesList = scope ? scope.split(' ') : ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.compose']

    // 7. Upsert into integrations table
    const upsertData: any = {
      founder_id: user.id,
      provider: 'gmail',
      status: 'active',
      access_token_encrypted: encryptedAccess,
      token_expires_at: expiresAt,
      scopes: scopesList,
      metadata: { gmail_email: email, gmail_name: name },
      updated_at: new Date().toISOString(),
    }

    if (encryptedRefresh) {
      upsertData.refresh_token_encrypted = encryptedRefresh
    } else {
      // Fetch existing integration row to preserve refresh token
      const { data: existing } = await supabase
        .from('integrations')
        .select('refresh_token_encrypted')
        .eq('founder_id', user.id)
        .eq('provider', 'gmail')
        .maybeSingle()

      if (existing?.refresh_token_encrypted) {
        upsertData.refresh_token_encrypted = existing.refresh_token_encrypted
      }
    }

    const { error: dbError } = await supabase
      .from('integrations')
      .upsert(upsertData, { onConflict: 'founder_id,provider' })

    if (dbError) {
      console.error('Failed to save integration to Supabase:', dbError)
      return NextResponse.redirect(`${REDIRECT_BASE}?gmail_error=database_save_failed`)
    }

    // 8. Redirect on success
    return NextResponse.redirect(`${REDIRECT_BASE}?gmail_connected=true`)
  } catch (err) {
    console.error('Internal OAuth error:', err)
    return NextResponse.redirect(`${REDIRECT_BASE}?gmail_error=internal_server_error`)
  }
}
