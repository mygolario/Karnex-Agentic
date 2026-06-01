'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

interface GmailConnectionBannerProps {
  isConnected: boolean
  gmailEmail: string | null
  status: 'active' | 'expired' | 'revoked' | null
  isLoading: boolean
  disconnect: () => Promise<void>
}

export default function GmailConnectionBanner({
  isConnected,
  gmailEmail,
  status,
  isLoading,
  disconnect,
}: GmailConnectionBannerProps) {
  const router = useRouter()
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const handleConnect = () => {
    // Navigate to Next.js API connect route
    router.push('/api/auth/gmail/connect')
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Gmail account? This will stop automated draft syncing.')) {
      return
    }

    try {
      setIsDisconnecting(true)
      await disconnect()
    } catch (e) {
      alert('Failed to disconnect Gmail account.')
    } finally {
      setIsDisconnecting(false)
    }
  }

  // 1. Loading / Shimmer State
  if (isLoading || isDisconnecting) {
    return (
      <div className="w-full rounded-xl border border-white/[0.06] bg-[#07070a] p-5 relative overflow-hidden animate-pulse">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="h-10 w-10 shrink-0 rounded-lg bg-zinc-800" />
            <div className="space-y-2 w-full sm:w-64">
              <div className="h-4 rounded bg-zinc-800 w-3/4" />
              <div className="h-3 rounded bg-zinc-800 w-1/2" />
            </div>
          </div>
          <div className="h-9 w-32 rounded-lg bg-zinc-800 shrink-0 self-end sm:self-auto" />
        </div>
      </div>
    )
  }

  // Determine active visual state
  const isTokenExpired = isConnected && status === 'expired'
  const isTokenConnected = isConnected && status === 'active'

  // 2. State: Connected (Active)
  if (isTokenConnected) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-[#070d0a]/60 p-5 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <svg className="h-5.5 w-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-bold text-zinc-100">Gmail Connected</h4>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  gmail.send · gmail.compose only
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 font-mono">{gmailEmail}</p>
            </div>
          </div>

          <button
            onClick={handleDisconnect}
            className="rounded-lg border border-white/[0.08] hover:border-red-500/30 hover:bg-red-500/5 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-red-400 transition-all cursor-pointer shrink-0 self-end sm:self-auto"
          >
            Disconnect Account
          </button>
        </div>
      </div>
    )
  }

  // 3. State: Connected but Expired
  if (isTokenExpired) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-[#0d0707]/60 p-5 backdrop-blur-xl transition-all duration-300 hover:border-red-500/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
              <svg className="h-5.5 w-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-100">Gmail Token Expired</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Your Gmail connection needs to be re-authorized to continue syncing drafts.
              </p>
            </div>
          </div>

          <button
            onClick={handleConnect}
            className="rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:brightness-110 px-4 py-2 text-xs font-bold text-white transition-all shadow-md shadow-red-600/10 shrink-0 self-end sm:self-auto cursor-pointer"
          >
            Reconnect Gmail &rarr;
          </button>
        </div>
      </div>
    )
  }

  // 4. State: Not Connected (Default)
  return (
    <div className="rounded-xl border border-yellow-500/20 bg-[#0d0c07]/60 p-5 backdrop-blur-xl transition-all duration-300 hover:border-yellow-500/30">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-400 relative">
            <svg className="h-5.5 w-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.22 0l-2.25 1.5" />
            </svg>
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
            </span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-100">Connect Gmail to Activate Outreach</h4>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-xl">
              Campaigns stay in draft mode until you connect your Gmail account. Karnex only requests compose and send permissions — it cannot read your inbox.
            </p>
          </div>
        </div>

        <button
          onClick={handleConnect}
          className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 px-4 py-2 text-xs font-bold text-white transition-all shadow-md shadow-violet-600/10 shrink-0 self-end sm:self-auto cursor-pointer"
        >
          Connect Gmail Account &rarr;
        </button>
      </div>
    </div>
  )
}
