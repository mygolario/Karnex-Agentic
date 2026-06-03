import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect unauthenticated to login or check onboarding for authenticated users
  if (user) {
    const { data: founder } = await supabase
      .from('founders')
      .select('onboarding_step, onboarding_completed')
      .eq('id', user.id)
      .maybeSingle()

    const onboardingStep = founder?.onboarding_step ?? 0
    const isHome = request.nextUrl.pathname.startsWith('/home')

    if (isHome && onboardingStep < 4 && !founder?.onboarding_completed) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  // Protected dashboard paths — redirect to /login if unauthenticated
  const protectedPaths = [
    '/home',
    '/dashboard',
    '/ideas',
    '/warroom',
    '/agents',
    '/compass',
    '/vault',
    '/settings',
    '/billing',
    '/studio',
    '/integrations',
  ]
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  const authPaths = ['/login', '/signup']
  const isAuthPage = authPaths.some(
    (path) => request.nextUrl.pathname === path
  )
  if (isAuthPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
