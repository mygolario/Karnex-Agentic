'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>
}) {
  const resolvedParams = use(searchParams)
  const errorParam = resolvedParams?.error
  const errorDescParam = resolvedParams?.error_description

  const [email, setEmail] = useState('')
  
  // Initialize state directly from params if present to avoid set-state-in-effect warning
  const initialStatus = (errorParam || errorDescParam) ? 'error' : 'idle'
  const initialErrorMessage = (errorParam || errorDescParam)
    ? (errorDescParam
        ? decodeURIComponent(errorDescParam.replace(/\+/g, ' '))
        : errorParam === 'auth_failed'
          ? 'Authentication failed. The login link might be expired or already used.'
          : 'Authentication failed. Please try again.')
    : ''

  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>(initialStatus)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (error) {
        setStatus('error')
        setErrorMessage(error.message)
      } else {
        setStatus('sent')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Something went wrong. Please try again.')
    }
  }

  const handleSocialLogin = async (provider: 'github' | 'google') => {
    setStatus('loading')
    setErrorMessage('')
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })
      if (error) {
        setStatus('error')
        setErrorMessage(error.message)
      }
    } catch {
      setStatus('error')
      setErrorMessage(`Failed to initialize ${provider} login.`)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#e5e5e5] font-sans flex lg:grid lg:grid-cols-2">
      
      {/* Left: Form side */}
      <div className="flex-1 flex flex-col justify-between px-6 py-8 md:px-12 lg:px-16 min-h-screen">
        {/* Header (Back link) */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-[13px] text-[#737373] hover:text-white transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M13 7H1M1 7l5 5M1 7l5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to home
          </Link>
          <Link href="/" className="flex items-center gap-2 font-display font-bold text-[18px] tracking-[-0.02em] text-white">
            <img src="/logo.jpeg" alt="Karnex Logo" className="h-5.5 w-5.5 rounded-md object-cover" />
            Karnex
          </Link>
        </div>

        {/* Center Form Container */}
        <div className="w-full max-w-sm mx-auto my-auto py-12">
          {status === 'sent' ? (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-[#1a1a1a] bg-[#0c0c0c] text-[#6366f1]">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="font-display font-semibold text-[22px] text-white tracking-[-0.01em]">Check your email</h2>
              <p className="mt-3 text-[14px] text-[#737373] leading-relaxed">
                We sent a magic link to <span className="font-medium text-white">{email}</span>
              </p>
              <p className="mt-1.5 text-[12px] text-[#525252]">Click the link in the email to sign in.</p>
              <button
                onClick={() => { setStatus('idle'); setEmail('') }}
                className="mt-8 text-[13px] font-medium text-[#6366f1] hover:text-[#5558e6] transition-colors cursor-pointer"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="font-display font-semibold text-[24px] text-white tracking-[-0.02em]">
                  Welcome back
                </h2>
                <p className="mt-2 text-[13px] text-[#737373]">
                  Sign in to access your co-founder board.
                </p>
              </div>

              {/* Social Logins */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => handleSocialLogin('google')}
                  disabled={status === 'loading'}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#1a1a1a] bg-[#0c0c0c] hover:bg-[#121212] py-2.5 text-[13px] text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                  </svg>
                  Google
                </button>
                <button
                  onClick={() => handleSocialLogin('github')}
                  disabled={status === 'loading'}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#1a1a1a] bg-[#0c0c0c] hover:bg-[#121212] py-2.5 text-[13px] text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                  </svg>
                  GitHub
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-[#1a1a1a]"></div>
                <span className="flex-shrink mx-4 text-[#525252] text-[11px] font-mono uppercase tracking-[0.05em]">or continue with email</span>
                <div className="flex-grow border-t border-[#1a1a1a]"></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email-input" className="block text-[13px] font-medium text-[#a1a1a1] mb-2">
                    Email address
                  </label>
                  <div className="relative flex items-center group">
                    <div className="absolute left-3.5 text-[#525252] group-focus-within:text-[#6366f1] transition-colors pointer-events-none">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </div>
                    <input
                      id="email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="founder@startup.com"
                      required
                      className="w-full rounded-lg border border-[#1a1a1a] bg-[#0c0c0c] pl-10 pr-4 py-3 text-[14px] text-white placeholder-[#525252] outline-none transition-all focus:border-[#6366f1] focus:ring-0"
                    />
                  </div>
                </div>

                {status === 'error' && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading' || !email}
                  className="w-full bg-[#6366f1] hover:bg-[#5558e6] text-white font-medium text-[14px] py-3.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                      </svg>
                      Sending magic link…
                    </span>
                  ) : (
                    'Send Magic Link'
                  )}
                </button>
              </form>

              {/* Toggle link */}
              <p className="mt-8 text-center text-[13px] text-[#737373]">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="font-medium text-[#6366f1] hover:text-[#5558e6] transition-colors ml-1">
                  Sign up
                </Link>
              </p>
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center lg:text-left text-[12px] text-[#525252]">
          &copy; {new Date().getFullYear()} Karnex Inc. All rights reserved.
        </div>
      </div>

      {/* Right: Video side */}
      <div className="hidden lg:block relative overflow-hidden border-l border-[#1a1a1a]">
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
          <video autoPlay muted loop playsInline className="w-full h-full object-cover opacity-60">
            <source src="/videos/auth-bg.mov" type="video/quicktime" />
            <source src="/videos/auth-bg.mov" type="video/mp4" />
          </video>
          {/* Vignette gradients for overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-[#050505]/30" />
        </div>

        {/* Overlay quote */}
        <div className="absolute inset-0 z-10 flex flex-col justify-end p-16 bg-gradient-to-t from-[#050505]/80 via-transparent to-transparent">
          <div className="max-w-md">
            <span className="text-[11px] font-mono tracking-[0.12em] uppercase text-[#6366f1] mb-4 block">
              Co-Founder Network
            </span>
            <blockquote className="font-display font-medium text-[28px] leading-[1.3] text-white tracking-[-0.02em] mb-6">
              &ldquo;The operating system for solo founders. Start alone, build with a full executive board from day one.&rdquo;
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="h-px w-8 bg-[#1a1a1a]" />
              <span className="text-[13px] text-[#737373]">Karnex Core</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
