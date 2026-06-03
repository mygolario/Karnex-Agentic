'use client'

import React from 'react'
import VaultOutputPreview from '@/components/vault/VaultOutputPreview'
import { downloadVaultOutput } from '@/lib/vault/download'
import {
  getAgentDisplayName,
  getSizeLabel,
  getVaultIcon,
  getVaultTitle,
  hasCodeFiles,
} from '@/lib/vault/presenters'
import type { VaultDownloadFormat, VaultRecord } from '@/lib/vault/types'

interface VaultItemProps {
  record: VaultRecord
  expanded: boolean
  onToggle: () => void
}

export default function VaultItem({ record, expanded, onToggle }: VaultItemProps) {
  const title = getVaultTitle(record)
  const icon = getVaultIcon(record)
  const agentName = getAgentDisplayName(record.agentId)
  const sizeLabel = getSizeLabel(record)
  const dateLabel = new Date(record.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const canZip = hasCodeFiles(record)

  const handleDownload = async (format: VaultDownloadFormat) => {
    await downloadVaultOutput(record, format)
  }

  return (
    <article
      className={`dash-card overflow-hidden transition-all ${
        expanded ? 'border-[#6366f1]/40 ring-1 ring-[#6366f1]/20' : ''
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 flex flex-col gap-3 cursor-pointer hover:bg-[#0a0a0a]/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className="text-[22px] shrink-0 leading-none mt-0.5" aria-hidden>
              {icon}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[14px] font-semibold text-white leading-snug line-clamp-2">
                {title}
              </h3>
              <p className="text-[12px] text-[#6366f1] mt-1 truncate">{agentName}</p>
            </div>
          </div>
          <span
            className={`text-[#525252] shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden
          >
            ▾
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-[#525252] font-mono pl-9">
          <span>{dateLabel}</span>
          <span>{sizeLabel}</span>
        </div>
      </button>

      {expanded ? (
        <div className="px-4 pb-4 pt-0 border-t border-[#1a1a1a] space-y-4">
          <VaultOutputPreview record={record} />
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleDownload('markdown')}
              className="dash-btn dash-btn-secondary text-[12px] py-1.5 px-3"
            >
              Download .md
            </button>
            <button
              type="button"
              onClick={() => handleDownload('json')}
              className="dash-btn dash-btn-secondary text-[12px] py-1.5 px-3"
            >
              Download .json
            </button>
            <button
              type="button"
              onClick={() => handleDownload('zip')}
              disabled={!canZip}
              title={canZip ? 'Download code as zip' : 'ZIP export only for code outputs'}
              className="dash-btn dash-btn-secondary text-[12px] py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Download .zip
            </button>
          </div>
        </div>
      ) : null}
    </article>
  )
}
