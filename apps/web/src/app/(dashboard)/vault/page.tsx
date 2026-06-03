'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Skeleton } from '@/components/Skeleton'
import VaultItem from '@/components/vault/VaultItem'
import NewIdeaModal from '@/components/vault/NewIdeaModal'
import {
  VAULT_CATEGORIES,
  countByCategory,
  filterByCategory,
} from '@/lib/vault/categories'
import { getSearchableText, mapAgentOutputRows } from '@/lib/vault/presenters'
import type { AgentOutputRow, VaultCategory, VaultRecord } from '@/lib/vault/types'

export default function VaultPage() {
  return (
    <ErrorBoundary>
      <VaultContent />
    </ErrorBoundary>
  )
}

function VaultContent() {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<VaultRecord[]>([])
  const [category, setCategory] = useState<VaultCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadVault = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('agent_outputs')
        .select(`
          id,
          agent_run_id,
          output_type,
          output,
          created_at,
          agent_runs (
            agent_id,
            agent_version,
            status,
            duration_ms
          )
        `)
        .eq('founder_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setRecords(mapAgentOutputRows((data ?? []) as AgentOutputRow[]))
    } catch (err) {
      console.error('Error fetching vault data:', err)
      setLoadError(err instanceof Error ? err.message : 'Failed to load vault.')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadVault()
  }, [loadVault])

  const counts = useMemo(() => countByCategory(records), [records])

  const filteredItems = useMemo(() => {
    let items = filterByCategory(records, category)
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      items = items.filter((record) =>
        getSearchableText(record).toLowerCase().includes(q)
      )
    }
    return items
  }, [records, category, searchQuery])

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 pb-16 dash-reveal">
      <div className="border-b border-[#1a1a1a] pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="section-label mb-2">Archive</p>
          <h1 className="font-display font-bold text-[28px] text-white tracking-[-0.025em]">
            Karnex Vault
          </h1>
          <p className="text-[13px] text-[#737373] mt-1 max-w-[520px]">
            Every output your agents produce — searchable, categorized, and ready to export.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="dash-btn dash-btn-primary shrink-0"
        >
          + New Idea
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-48 shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {VAULT_CATEGORIES.map((cat) => {
              const active = category === cat.id
              const count = counts[cat.id]
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#6366f1]/10 text-white border border-[#6366f1]/30'
                      : 'text-[#525252] hover:text-[#a1a1a1] border border-transparent'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[11px] font-mono ${active ? 'text-[#6366f1]' : 'text-[#404040]'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        <div className="flex-1 min-w-0 space-y-6">
          <div className="relative">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search titles and content…"
              className="dash-input w-full pl-10"
              aria-label="Search vault"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525252] pointer-events-none" aria-hidden>
              ⌕
            </span>
          </div>

          {loadError ? (
            <div className="border border-red-500/30 bg-red-500/5 rounded-2xl p-4 text-[13px] text-red-400">
              {loadError}
            </div>
          ) : null}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="border border-[#1a1a1a] border-dashed rounded-2xl p-16 text-center space-y-4">
              <p className="text-[14px] text-[#525252]">
                {records.length === 0
                  ? 'No agent outputs yet. Run agents from Home or Studio — they appear here automatically.'
                  : 'No items match your filter.'}
              </p>
              {records.length === 0 ? (
                <div className="flex flex-wrap justify-center gap-3">
                  <a href="/home" className="dash-btn dash-btn-secondary text-[13px]">
                    Go to Journey
                  </a>
                  <a href="/studio" className="dash-btn dash-btn-secondary text-[13px]">
                    Open Studio
                  </a>
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="dash-btn dash-btn-primary text-[13px]"
                  >
                    + New Idea
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
              {filteredItems.map((record) => (
                <VaultItem
                  key={record.id}
                  record={record}
                  expanded={expandedId === record.id}
                  onToggle={() => handleToggle(record.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <NewIdeaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadVault}
      />
    </div>
  )
}
