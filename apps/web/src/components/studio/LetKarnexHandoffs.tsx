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
    <div className="shrink-0 px-4 py-3 border-t border-b border-[#1a1a26]/60 bg-[#0a0a0f] flex flex-wrap items-center gap-3">
      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
        <svg className="w-3.5 h-3.5 text-[#6366f1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span>Delegate Tasks:</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((id) => {
          const meta = AGENT_LINKS[id] || { label: id, href: '/home' }
          return (
            <Link
              key={id}
              href={meta.href}
              className="group text-[12px] font-medium px-3.5 py-1.5 rounded-lg bg-[#13131c] border border-[#2b2b3d] hover:border-[#6366f1]/50 hover:bg-[#1a1a29] text-zinc-200 hover:text-white transition-all duration-300 shadow-[0_2px_6px_rgba(0,0,0,0.15)] flex items-center gap-1.5"
            >
              <span>{meta.label}</span>
              <svg className="w-3 h-3 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
