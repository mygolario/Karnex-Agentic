import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import { encryptToken } from '@/lib/integrations/encryption'
import {
  generateOAuthState,
  oauthCallbackPath,
  oauthStateCookieName,
} from '@/lib/integrations/oauth'

const INTEGRATIONS_REDIRECT = `${env.NEXT_PUBLIC_APP_URL}/integrations`

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  scope: z.string().optional(),
})

export async function startGmailConnect(options?: {
  legacyCallback?: boolean
}): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const legacy = options?.legacyCallback ?? false
  const callbackPath = legacy
    ? '/api/auth/callback/gmail'
    : oauthCallbackPath('gmail')

  const state = generateOAuthState()
  const cookieStore = await cookies()
  cookieStore.set(oauthStateCookieName('gmail'), state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: callbackPath,
  })

  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}${callbackPath}`
  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose',
  ].join(' ')

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  googleAuthUrl.searchParams.set('client_id', env.GMAIL_CLIENT_ID)
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri)
  googleAuthUrl.searchParams.set('response_type', 'code')
  googleAuthUrl.searchParams.set('scope', scopes)
  googleAuthUrl.searchParams.set('access_type', 'offline')
  googleAuthUrl.searchParams.set('prompt', 'consent')
  googleAuthUrl.searchParams.set('state', state)

  return NextResponse.redirect(googleAuthUrl.toString())
}

export async function startGithubConnect(): Promise<NextResponse> {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'GitHub OAuth is not configured' },
      { status: 503 }
    )
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const state = generateOAuthState()
  const cookieStore = await cookies()
  cookieStore.set(oauthStateCookieName('github'), state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: oauthCallbackPath('github'),
  })

  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}${oauthCallbackPath('github')}`
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize')
  githubAuthUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID)
  githubAuthUrl.searchParams.set('redirect_uri', redirectUri)
  githubAuthUrl.searchParams.set('scope', 'repo read:user')
  githubAuthUrl.searchParams.set('state', state)

  return NextResponse.redirect(githubAuthUrl.toString())
}

export async function handleGmailCallback(
  request: Request,
  options?: { legacyCallback?: boolean }
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const legacy = options?.legacyCallback ?? false
  const callbackPath = legacy
    ? '/api/auth/callback/gmail'
    : oauthCallbackPath('gmail')

  const cookieStore = await cookies()
  const savedState = cookieStore.get(oauthStateCookieName('gmail'))?.value
  cookieStore.delete(oauthStateCookieName('gmail'))

  if (error) {
    return NextResponse.redirect(`${INTEGRATIONS_REDIRECT}?error=${error}`)
  }
  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${INTEGRATIONS_REDIRECT}?error=invalid_state`)
  }
  if (!code) {
    return NextResponse.redirect(`${INTEGRATIONS_REDIRECT}?error=missing_code`)
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${INTEGRATIONS_REDIRECT}?error=unauthorized`)
  }

  try {
    const redirectUri = `${env.NEXT_PUBLIC_APP_URL}${callbackPath}`
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GMAIL_CLIENT_ID,
        client_secret: env.GMAIL_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      return NextResponse.redirect(
        `${INTEGRATIONS_REDIRECT}?error=token_exchange_failed`
      )
    }

    const parsedToken = tokenResponseSchema.safeParse(await tokenResponse.json())
    if (!parsedToken.success) {
      return NextResponse.redirect(
        `${INTEGRATIONS_REDIRECT}?error=token_exchange_failed`
      )
    }

    const { access_token, refresh_token, expires_in, scope } = parsedToken.data

    const profileResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/profile',
      { headers: { Authorization: `Bearer ${access_token}` } }
    )

    let email = 'unknown@gmail.com'
    let name = 'Gmail User'
    if (profileResponse.ok) {
      const rawProfile = await profileResponse.json()
      const parsedProfile = z
        .object({ emailAddress: z.string().email() })
        .safeParse(rawProfile)
      if (parsedProfile.success) {
        email = parsedProfile.data.emailAddress
        name = email.split('@')[0]
      }
    }

    const encryptedAccess = encryptToken(access_token, env.ENCRYPTION_KEY)
    const encryptedRefresh = refresh_token
      ? encryptToken(refresh_token, env.ENCRYPTION_KEY)
      : null

    const expiresAt = new Date(
      Date.now() + (expires_in ?? 3600) * 1000
    ).toISOString()
    const scopesList = scope
      ? scope.split(' ')
      : [
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.compose',
        ]

    const upsertData: Record<string, unknown> = {
      founder_id: user.id,
      provider: 'gmail',
      status: 'active',
      access_token_encrypted: encryptedAccess,
      token_expires_at: expiresAt,
      scopes: scopesList,
      metadata: { gmail_email: email, gmail_name: name },
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (encryptedRefresh) {
      upsertData.refresh_token_encrypted = encryptedRefresh
    } else {
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
      console.error('Gmail save failed:', dbError)
      return NextResponse.redirect(
        `${INTEGRATIONS_REDIRECT}?error=database_save_failed`
      )
    }

    return NextResponse.redirect(`${INTEGRATIONS_REDIRECT}?connected=gmail`)
  } catch (err) {
    console.error('Gmail OAuth error:', err)
    return NextResponse.redirect(
      `${INTEGRATIONS_REDIRECT}?error=internal_server_error`
    )
  }
}

export async function handleGithubCallback(
  request: Request
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const cookieStore = await cookies()
  const savedState = cookieStore.get(oauthStateCookieName('github'))?.value
  cookieStore.delete(oauthStateCookieName('github'))

  if (error) {
    return NextResponse.redirect(`${INTEGRATIONS_REDIRECT}?error=${error}`)
  }
  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${INTEGRATIONS_REDIRECT}?error=invalid_state`)
  }
  if (!code) {
    return NextResponse.redirect(`${INTEGRATIONS_REDIRECT}?error=missing_code`)
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${INTEGRATIONS_REDIRECT}?error=unauthorized`)
  }

  try {
    const redirectUri = `${env.NEXT_PUBLIC_APP_URL}${oauthCallbackPath('github')}`
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
        }),
      }
    )

    if (!tokenResponse.ok) {
      return NextResponse.redirect(
        `${INTEGRATIONS_REDIRECT}?error=token_exchange_failed`
      )
    }

    const raw = await tokenResponse.json()
    const parsed = tokenResponseSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.redirect(
        `${INTEGRATIONS_REDIRECT}?error=token_exchange_failed`
      )
    }

    const { access_token, scope } = parsed.data
    const encryptedAccess = encryptToken(access_token, env.ENCRYPTION_KEY)

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/vnd.github+json',
      },
    })

    let login = 'github-user'
    if (userRes.ok) {
      const u = (await userRes.json()) as { login?: string }
      if (u.login) login = u.login
    }

    const scopesList = scope ? scope.split(/[,\s]+/).filter(Boolean) : ['repo']

    const { error: dbError } = await supabase.from('integrations').upsert(
      {
        founder_id: user.id,
        provider: 'github',
        status: 'active',
        access_token_encrypted: encryptedAccess,
        refresh_token_encrypted: null,
        token_expires_at: null,
        scopes: scopesList,
        metadata: { github_login: login },
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'founder_id,provider' }
    )

    if (dbError) {
      console.error('GitHub save failed:', dbError)
      return NextResponse.redirect(
        `${INTEGRATIONS_REDIRECT}?error=database_save_failed`
      )
    }

    return NextResponse.redirect(`${INTEGRATIONS_REDIRECT}?connected=github`)
  } catch (err) {
    console.error('GitHub OAuth error:', err)
    return NextResponse.redirect(
      `${INTEGRATIONS_REDIRECT}?error=internal_server_error`
    )
  }
}
