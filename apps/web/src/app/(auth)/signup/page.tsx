'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

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
          data: { full_name: fullName },
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

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07070f]">
      {/* Gradient background orbs */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[128px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-violet-600/15 blur-[128px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[96px]" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="mb-10 text-center">
          <h1 className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            Karnex
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Build your startup with AI agents
          </p>
        </div>

        {/* Glass card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-2xl shadow-blue-500/5 backdrop-blur-xl">
          {status === 'sent' ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 ring-1 ring-blue-500/30">
                <svg className="h-8 w-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Check your email</h2>
              <p className="mt-2 text-sm text-zinc-400">
                We sent a magic link to <span className="font-medium text-zinc-200">{email}</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">Click the link to complete your signup.</p>
              <button
                onClick={() => { setStatus('idle'); setEmail(''); setFullName('') }}
                className="mt-6 text-sm text-blue-400 transition-colors hover:text-blue-300"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-center text-xl font-semibold text-white">
                Create your account
              </h2>
              <p className="mt-1 text-center text-sm text-zinc-500">
                Start building with your AI co-founder
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="name-input" className="block text-sm font-medium text-zinc-300">
                    Full name
                  </label>
                  <input
                    id="name-input"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Chen"
                    required
                    className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25"
                  />
                </div>

                <div>
                  <label htmlFor="email-input" className="block text-sm font-medium text-zinc-300">
                    Email address
                  </label>
                  <input
                    id="email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="founder@startup.com"
                    required
                    className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25"
                  />
                </div>

                {status === 'error' && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading' || !email || !fullName}
                  className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/30 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === 'loading' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                      </svg>
                      Creating account…
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer link */}
        <p className="mt-8 text-center text-sm text-zinc-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-400 transition-colors hover:text-blue-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
