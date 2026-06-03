'use client'

import React from 'react'

interface Version {
  id: string
  prompt: string
  fileCount: number
  timestamp: Date
}

interface VersionTimelineProps {
  visible: boolean
  versions: Version[]
  activeVersionId: string | null
  onSelectVersion: (id: string) => void
  onClose: () => void
}

export default function VersionTimeline({
  visible,
  versions,
  activeVersionId,
  onSelectVersion,
  onClose,
}: VersionTimelineProps) {
  if (!visible) return null

  return (
    <div className="w-[280px] bg-[#09090b] border-l border-[#141417] flex flex-col shrink-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#141417]">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
          Version History
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.03] transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto forge-scroll p-4">
        {versions.length === 0 ? (
          <p className="text-[11px] text-zinc-700 text-center mt-8">No versions yet</p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-[#1a1a1a]" />

            <div className="space-y-5">
              {versions.map((version, i) => {
                const isActive = version.id === activeVersionId
                return (
                  <button
                    key={version.id}
                    onClick={() => onSelectVersion(version.id)}
                    className="flex items-start gap-3 w-full text-left group relative"
                  >
                    {/* Node dot */}
                    <div className="relative z-10 mt-[3px] shrink-0">
                      <div
                        className={`h-[10px] w-[10px] rounded-full border-2 transition-colors ${
                          isActive
                            ? 'bg-[#6366f1] border-[#6366f1]'
                            : 'bg-[#09090b] border-zinc-700 group-hover:border-zinc-500'
                        }`}
                      />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className={`text-[11px] leading-[1.5] line-clamp-2 transition-colors ${
                        isActive ? 'text-zinc-200' : 'text-zinc-400 group-hover:text-zinc-300'
                      }`}>
                        {version.prompt}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-zinc-600">
                          {version.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-zinc-800">·</span>
                        <span className="text-[10px] text-zinc-600">
                          {version.fileCount} file{version.fileCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
