'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface SidebarNavProps {
  user: {
    email: string
    fullName: string
  }
}

export default function SidebarNav({ user }: SidebarNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
    },
    {
      href: '/ideas',
      label: 'Dream Engine',
      icon: (
        <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
      ),
    },
    {
      href: '/warroom',
      label: 'War Room',
      icon: (
        <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
        </svg>
      ),
    },
    {
      href: '/agents',
      label: 'Agent Hub',
      icon: (
        <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
        </svg>
      ),
    },
    {
      href: '/compass',
      label: 'Compass',
      icon: (
        <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm0 0v.938m0 17.063V21m9.75-9H20.812M3.188 12H2.25m15.372-6.372l-.663.663M7.041 16.959l-.663.663m12.244 0l-.663-.663M7.041 7.041l-.663-.663" />
        </svg>
      ),
    },
  ]

  const settingsItems = [
    {
      href: '/settings',
      label: 'Settings',
      icon: (
        <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      href: '/billing',
      label: 'Billing',
      icon: (
        <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      ),
    },
  ]

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(path)
  }

  const userInitial = (user.fullName?.[0] ?? user.email?.[0] ?? 'K').toUpperCase()

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-[#1a1a1a]/40 bg-[#040406]/95 backdrop-blur-xl transition-all">
      
      {/* Brand Logo Header */}
      <div className="flex h-20 items-center justify-between border-b border-[#1a1a1a]/30 px-6">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="font-display text-[22px] font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Karnex
          </span>
          <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-bold text-indigo-400 ring-1 ring-inset ring-indigo-500/15 tracking-wide font-mono">
            BETA
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
        <div>
          <p className="px-3 text-[9px] font-bold tracking-wider text-zinc-600 uppercase font-mono">
            Product Builder
          </p>
          <nav className="mt-2.5 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide transition-all ${
                    active
                      ? 'bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-transparent text-indigo-400 border-l-2 border-indigo-500 pl-2.5'
                      : 'text-zinc-500 hover:bg-white/[0.01] hover:text-zinc-200 pl-3'
                  }`}
                >
                  <span className={`transition-colors ${active ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                    {item.icon}
                  </span>
                  {item.label}
                  {active && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        <div>
          <p className="px-3 text-[9px] font-bold tracking-wider text-zinc-600 uppercase font-mono">
            Settings & Billing
          </p>
          <nav className="mt-2.5 space-y-1">
            {settingsItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide transition-all ${
                    active
                      ? 'bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-transparent text-indigo-400 border-l-2 border-indigo-500 pl-2.5'
                      : 'text-zinc-500 hover:bg-white/[0.01] hover:text-zinc-200 pl-3'
                  }`}
                >
                  <span className={`transition-colors ${active ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                    {item.icon}
                  </span>
                  {item.label}
                  {active && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* User Section / Sign Out */}
      <div className="border-t border-[#1a1a1a]/30 p-4 bg-[#060608]/90">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-indigo-500/20 bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-xs font-bold text-indigo-300 shadow-inner">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-zinc-300">
              {user.fullName || 'Founder'}
            </p>
            <p className="truncate text-[9px] text-zinc-500 font-mono">
              {user.email}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          type="button"
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#1a1a1a] hover:border-red-950/40 bg-transparent hover:bg-red-500/[0.02] px-3 py-2.5 text-xs font-semibold text-zinc-500 hover:text-red-400 transition-all cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
