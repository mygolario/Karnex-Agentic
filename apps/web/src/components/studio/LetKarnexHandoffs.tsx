'use client'

import React from 'react'
import Link from 'next/link'

const AGENT_LINKS: Record<string, { label: string; href: string }> = {
  'research-v1': { label: 'Research competitors', href: '/home' },
  'outreach-v1': { label: 'Draft outreach', href: '/home' },
  'analytics-insight-v1': { label: 'Add analytics', href: '/home' },
}

interface LetKarnexHandoffsProps {
  actions: string[]
}

export default function LetKarnexHandoffs({ actions }: LetKarnexHandoffsProps) {
  if (!actions.length) return null

  return (
    <div className="shrink-0 px-4 py-2 border-t border-[#141417] bg-[#6366f1]/5 flex flex-wrap items-center gap-2">
      <span className="text-[11px] text-zinc-500">Let Karnex:</span>
      {actions.map((id) => {
        const meta = AGENT_LINKS[id] || { label: id, href: '/home' }
        return (
          <Link
            key={id}
            href={meta.href}
            className="text-[11px] px-2 py-1 rounded-md border border-[#6366f1]/30 text-[#a5b4fc] hover:bg-[#6366f1]/10"
          >
            {meta.label}
          </Link>
        )
      })}
    </div>
  )
}
