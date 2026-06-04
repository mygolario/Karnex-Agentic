'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CatalogModel } from '@/lib/studio/forge-types'

interface ModelPickerProps {
  modelId: string
  autoModel: boolean
  maxMode: boolean
  onModelIdChange: (id: string) => void
  onAutoModelChange: (v: boolean) => void
  onMaxModeChange: (v: boolean) => void
  toolsStatus?: 'ok' | 'degraded'
  compact?: boolean
  useAllSteps?: boolean
  onUseAllStepsChange?: (v: boolean) => void
  showDeveloperOptions?: boolean
}

function ModelInfoTooltip({ model }: { model: CatalogModel }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
        className="text-zinc-600 hover:text-zinc-400 w-4 h-4 text-[10px] font-bold rounded-full border border-zinc-700"
        title="Model info"
        aria-label="Model info"
      >
        i
      </button>
      {open && (
        <div className="absolute left-0 bottom-full mb-1 z-[60] w-[220px] p-2 bg-[#0c0c0f] border border-[#262626] rounded text-[10px] text-zinc-400 shadow-lg">
          <p>
            <span className="text-zinc-500">OpenRouter:</span>{' '}
            <span className="text-zinc-300 font-mono">{model.openrouter_model}</span>
          </p>
          {model.best_for && (
            <p className="mt-1">
              <span className="text-zinc-500">Best for:</span> {model.best_for}
            </p>
          )}
          {model.max_tokens && (
            <p className="mt-1">
              <span className="text-zinc-500">Max tokens:</span> {model.max_tokens.toLocaleString()}
            </p>
          )}
        </div>
      )}
    </span>
  )
}

export default function ModelPicker({
  modelId,
  autoModel,
  maxMode,
  onModelIdChange,
  onAutoModelChange,
  onMaxModeChange,
  toolsStatus = 'ok',
  compact = false,
  useAllSteps = false,
  onUseAllStepsChange,
  showDeveloperOptions = false,
}: ModelPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [models, setModels] = useState<CatalogModel[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [defaultId, setDefaultId] = useState('karnex-forge-fast-high')
  const [syncing, setSyncing] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const loadModels = useCallback((sync = false) => {
    const url = sync ? '/api/forge/models?sync=1' : '/api/forge/models'
    return fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setModels(data.models || [])
        if (data.default_model_id) setDefaultId(data.default_model_id)
        if (Array.isArray(data.favorites)) setFavorites(data.favorites)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    void loadModels()
  }, [loadModels])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const toggleFavorite = async (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id]
    setFavorites(next)
    await fetch('/api/forge/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorites: next }),
    })
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = [...models].sort((a, b) => {
      const af = favorites.includes(a.id) ? 0 : 1
      const bf = favorites.includes(b.id) ? 0 : 1
      return af - bf
    })
    if (!q) return list
    return list.filter(
      (m) =>
        m.display_name.toLowerCase().includes(q) ||
        m.tier.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.openrouter_model?.toLowerCase().includes(q)
    )
  }, [models, search, favorites])

  const selected = models.find((m) => m.id === modelId) || models[0]
  const footerLabel = autoModel
    ? 'Auto'
    : selected
      ? `${selected.display_name} (${selected.tier})`
      : 'Select model'

  return (
    <div ref={ref} className={`relative ${compact ? '' : 'shrink-0'}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-[12px] text-zinc-400 hover:text-zinc-200 border border-[#141417] rounded-md px-2.5 py-1.5 bg-[#09090b]"
      >
        <span className="truncate max-w-[160px]">{footerLabel}</span>
        <span className="text-zinc-600">{open ? '▲' : '▼'}</span>
        {toolsStatus === 'degraded' && (
          <span className="text-amber-400 text-[10px] font-medium">Tools degraded</span>
        )}
        {toolsStatus === 'ok' && !compact && (
          <span className="text-emerald-500/80 text-[10px]">Tools OK</span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-[300px] max-h-[400px] overflow-hidden flex flex-col bg-[#0c0c0f] border border-[#1f1f24] rounded-lg shadow-xl z-50">
          <div className="p-2 border-b border-[#141417]">
            <input
              type="text"
              placeholder="Search models"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#050505] border border-[#141417] rounded px-2 py-1.5 text-[12px] text-zinc-300 placeholder:text-zinc-600"
            />
          </div>

          <div className="px-3 py-2 flex items-center justify-between border-b border-[#141417]">
            <span className="text-[12px] text-zinc-400">Auto</span>
            <button
              type="button"
              role="switch"
              aria-checked={autoModel}
              onClick={() => onAutoModelChange(!autoModel)}
              className={`w-9 h-5 rounded-full transition-colors ${autoModel ? 'bg-[#6366f1]' : 'bg-zinc-700'}`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transform transition-transform mx-0.5 ${autoModel ? 'translate-x-4' : ''}`}
              />
            </button>
          </div>
          <div className="px-3 py-2 flex items-center justify-between border-b border-[#141417]">
            <span className="text-[12px] text-zinc-400">MAX Mode</span>
            <button
              type="button"
              role="switch"
              aria-checked={maxMode}
              onClick={() => onMaxModeChange(!maxMode)}
              className={`w-9 h-5 rounded-full transition-colors ${maxMode ? 'bg-[#6366f1]' : 'bg-zinc-700'}`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transform transition-transform mx-0.5 ${maxMode ? 'translate-x-4' : ''}`}
              />
            </button>
          </div>

          {showDeveloperOptions && onUseAllStepsChange && (
            <div className="px-3 py-2 flex items-center justify-between border-b border-[#141417]">
              <span className="text-[12px] text-zinc-400" title="Use selected model for all subagent steps">
                All steps same model
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={useAllSteps}
                onClick={() => onUseAllStepsChange(!useAllSteps)}
                className={`w-9 h-5 rounded-full transition-colors ${useAllSteps ? 'bg-[#6366f1]' : 'bg-zinc-700'}`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transform transition-transform mx-0.5 ${useAllSteps ? 'translate-x-4' : ''}`}
                />
              </button>
            </div>
          )}

          <div className="overflow-y-auto flex-1 py-1">
            {filtered.map((m) => {
              const active = !autoModel && m.id === modelId
              const fav = favorites.includes(m.id)
              return (
                <div
                  key={m.id}
                  className={`w-full flex items-center gap-1 px-2 py-2 text-left text-[12px] hover:bg-white/[0.04] ${active ? 'bg-white/[0.06]' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleFavorite(m.id)}
                    className={`shrink-0 text-[14px] ${fav ? 'text-amber-400' : 'text-zinc-700 hover:text-zinc-500'}`}
                    aria-label={fav ? 'Remove favorite' : 'Add favorite'}
                  >
                    {fav ? '★' : '☆'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAutoModelChange(false)
                      onModelIdChange(m.id)
                      setOpen(false)
                    }}
                    className="flex-1 flex items-center gap-2 min-w-0"
                  >
                    <span className="flex-1 text-zinc-200 truncate text-left">
                      {m.display_name}{' '}
                      <span className="text-zinc-500">({m.tier})</span>
                    </span>
                    {m.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
                        {m.badge}
                      </span>
                    )}
                    {active && <span className="text-[#6366f1] shrink-0">✓</span>}
                  </button>
                  <ModelInfoTooltip model={m} />
                </div>
              )
            })}
          </div>

          <div className="p-2 border-t border-[#141417] flex items-center justify-between gap-2">
            <span className="text-[10px] text-zinc-600 truncate">Default: {defaultId}</span>
            <button
              type="button"
              disabled={syncing}
              onClick={() => {
                setSyncing(true)
                void loadModels(true).finally(() => setSyncing(false))
              }}
              className="text-[10px] text-[#818cf8] hover:text-white shrink-0"
            >
              {syncing ? 'Syncing…' : 'Sync OpenRouter'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
