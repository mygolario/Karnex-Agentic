'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BuilderRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/forge')
  }, [router])

  return (
    <div className="flex min-h-[400px] items-center justify-center bg-[#050505] text-zinc-500 font-mono text-xs">
      <span className="relative flex h-2 w-2 mr-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
      </span>
      Redirecting to Karnex Forge...
    </div>
  )
}
