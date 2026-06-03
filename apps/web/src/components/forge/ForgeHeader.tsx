'use client'

import React, { useRef, useEffect } from 'react'

interface ForgeHeaderProps {
  projectName: string
  activeTab: 'preview' | 'code' | 'database' | 'deploy'
  onTabChange: (tab: 'preview' | 'code' | 'database' | 'deploy') => void
  onDeploy: () => void
  onToggleVersions: () => void
  hasOutput: boolean
}

const tabs = [
  { id: 'preview' as const, label: 'Preview' },
  { id: 'code' as const, label: 'Code' },
  { id: 'database' as const, label: 'Database' },
  { id: 'deploy' as const, label: 'Deploy' },
]

export default function ForgeHeader({
  projectName,
  activeTab,
  onTabChange,
  onDeploy,
  onToggleVersions,
  hasOutput,
}: ForgeHeaderProps) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const indicatorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const activeEl = tabRefs.current[activeTab]
    const indicator = indicatorRef.current
    if (activeEl && indicator) {
      indicator.style.left = `${activeEl.offsetLeft}px`
      indicator.style.width = `${activeEl.offsetWidth}px`
    }
  }, [activeTab])

  return (
    <div className="h-12 flex items-center justify-between px-5 bg-[#0a0a0e]/90 backdrop-blur-sm border-b border-[#141417] shrink-0 relative z-20">
      {/* Left — Brand + Project */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-display text-[15px] font-semibold text-white tracking-[-0.01em] shrink-0">
          Forge
        </span>
        <span className="text-[#262626] text-[14px] shrink-0">/</span>
        <span className="text-[13px] text-zinc-400 truncate max-w-[180px]">
          {projectName || 'Untitled project'}
        </span>
      </div>

      {/* Center — Tabs */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center relative">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[tab.id] = el }}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors relative z-10 ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Sliding indicator */}
        <div
          ref={indicatorRef}
          className="absolute bottom-0 h-[2px] bg-[#6366f1] rounded-full forge-tab-indicator"
          style={{ left: 0, width: 0 }}
        />
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggleVersions}
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition-colors"
          title="Version history"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {hasOutput && (
          <button
            onClick={onDeploy}
            className="flex items-center gap-1.5 bg-[#6366f1] hover:bg-[#5558e6] text-white text-[12px] font-medium rounded-md px-3 py-1.5 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Deploy
          </button>
        )}
      </div>
    </div>
  )
}
