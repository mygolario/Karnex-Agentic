'use client'

import React from 'react'

interface ForgeStatusBarProps {
  activeAgent: string | null
  buildDuration: number | null
  fileCount: number
  framework: string
  gitConnected: boolean
}

export default function ForgeStatusBar({
  activeAgent,
  buildDuration,
  fileCount,
  framework,
  gitConnected,
}: ForgeStatusBarProps) {
  return (
    <div className="h-7 flex items-center justify-between px-4 bg-[#09090b] border-t border-[#141417] font-mono text-[10px] shrink-0 select-none">
      {/* Left — Agent status */}
      <div className="flex items-center gap-2">
        {activeAgent ? (
          <>
            <span className="h-[5px] w-[5px] rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-400">{activeAgent}</span>
          </>
        ) : (
          <>
            <span className="h-[5px] w-[5px] rounded-full bg-zinc-700" />
            <span className="text-zinc-600">Ready</span>
          </>
        )}
      </div>

      {/* Center — Build info */}
      <div className="flex items-center gap-3 text-zinc-500">
        {buildDuration !== null && (
          <>
            <span>{buildDuration}s</span>
            <span className="text-zinc-700">·</span>
          </>
        )}
        {fileCount > 0 && (
          <span>{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Right — Framework + Git */}
      <div className="flex items-center gap-3">
        <span className="text-zinc-600">{framework}</span>
        <span className="text-zinc-800">·</span>
        <div className="flex items-center gap-1.5">
          <span className={`h-[5px] w-[5px] rounded-full ${gitConnected ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
          <span className="text-zinc-600">{gitConnected ? 'Synced' : 'Local'}</span>
        </div>
      </div>
    </div>
  )
}
