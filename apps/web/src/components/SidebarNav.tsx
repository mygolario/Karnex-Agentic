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
    { href: '/home', label: 'Home', icon: 'ti-home' },
    { href: '/studio', label: 'Studio', icon: 'ti-code' },
    { href: '/integrations', label: 'Integrations', icon: 'ti-plug' },
    { href: '/vault', label: 'Vault', icon: 'ti-lock' },
    { href: '/settings', label: 'Settings', icon: 'ti-settings' }
  ]

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'ti-home':
        return (
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        )
      case 'ti-code':
        return (
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
          </svg>
        )
      case 'ti-plug':
        return (
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622a4.5 4.5 0 01-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
          </svg>
        )
      case 'ti-lock':
        return (
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        )
      case 'ti-settings':
        return (
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      default:
        return null
    }
  }

  const isActive = (path: string) => {
    if (path === '/home') {
      return pathname === '/home'
    }
    return pathname.startsWith(path)
  }

  const userInitial = (user.fullName?.[0] ?? user.email?.[0] ?? 'K').toUpperCase()

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-[#1a1a1a] bg-[#050505]">
      
      {/* Brand */}
      <div className="flex h-14 items-center px-6 border-b border-[#1a1a1a]">
        <Link href="/home" className="group flex items-center gap-2.5">
          <img 
            src="/logo.jpeg" 
            alt="Karnex Logo" 
            className="h-8 w-8 rounded-lg object-cover transition-all duration-300 group-hover:scale-105 group-hover:brightness-110" 
          />
          <span className="font-display font-semibold text-[17px] tracking-[-0.03em] text-white/95 group-hover:text-white transition-colors duration-300">
            Karnex
          </span>
          <span className="text-[11px] font-medium tracking-[0.05em] uppercase text-[#6366f1] bg-[#6366f1]/10 px-2 py-0.5 rounded">
            Beta
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        <div>
          <p className="muted-label px-3 mb-3">
            Co-Founder Workspace
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
                    active
                      ? 'text-white bg-white/[0.04] border-l-2 border-[#6366f1] ml-0 pl-2.5'
                      : 'text-[#737373] hover:text-[#e5e5e5] hover:bg-white/[0.02]'
                  }`}
                >
                  <span className={`transition-colors ${active ? 'text-[#6366f1]' : 'text-[#525252] group-hover:text-[#a1a1a1]'}`}>
                    {renderIcon(item.icon)}
                  </span>
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* User Section */}
      <div className="border-t border-[#1a1a1a] p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6366f1]/10 text-[13px] font-semibold text-[#6366f1]">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-[#e5e5e5]">
              {user.fullName || 'Founder'}
            </p>
            <p className="truncate text-[11px] text-[#525252]">
              {user.email}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          type="button"
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#1a1a1a] hover:border-[#262626] px-3 py-2 text-[13px] text-[#737373] hover:text-[#e5e5e5] transition-colors cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  )
}
