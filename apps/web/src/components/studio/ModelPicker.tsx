'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CatalogModel } from '@/lib/studio/forge-types'
import { Search, Star, Info, Check, RefreshCw } from 'lucide-react'

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
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="relative flex items-center shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className="text-zinc-500 hover:text-zinc-300 w-5 h-5 rounded-md flex items-center justify-center border border-zinc-800 bg-zinc-900/50 text-[10px] hover:bg-zinc-800 transition-colors"
        title="Model info"
        aria-label="Model info"
      >
        <Info className="w-3 h-3" />
      </button>
      {hovered && (
        <div className="absolute right-0 bottom-full mb-2 z-[70] w-[240px] p-3 bg-zinc-950/95 backdrop-blur-xl border border-zinc-850 rounded-lg text-[11px] text-zinc-300 shadow-xl pointer-events-none flex flex-col gap-1.5 animate-reveal leading-relaxed">
          <div className="border-b border-zinc-800/50 pb-1.5 mb-1">
            <span className="font-semibold text-white block truncate">{model.display_name}</span>
            <span className="text-[9px] text-zinc-500 font-mono block truncate">{model.openrouter_model}</span>
          </div>
          {model.best_for && (
            <div>
              <span className="text-zinc-500 text-[10px] block">Best For</span>
              <span className="text-zinc-300">{model.best_for}</span>
            </div>
          )}
          {model.max_tokens && (
            <div className="flex justify-between items-center mt-1 pt-1 border-t border-zinc-900/35">
              <span className="text-zinc-500 text-[10px]">Context Limit</span>
              <span className="text-zinc-200 font-mono text-[10px]">{model.max_tokens.toLocaleString()} tokens</span>
            </div>
          )}
          {model.tier && (
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 text-[10px]">Tier</span>
              <span className="text-zinc-200 capitalize font-mono text-[10px]">{model.tier}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ToggleSwitch({
  checked,
  onChange,
  label,
  description
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-white/[0.02] transition-colors">
      <div className="flex flex-col min-w-0 pr-2">
        <span className="text-[12px] font-medium text-zinc-300">{label}</span>
        {description && <span className="text-[9px] text-zinc-500 truncate">{description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-8 h-4.5 rounded-full transition-colors relative duration-200 cursor-pointer shrink-0 ${checked ? 'bg-[#6366f1]' : 'bg-zinc-800'}`}
      >
        <span
          className={`block w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform duration-200 ${checked ? 'left-4' : 'left-0.5'}`}
        />
      </button>
    </div>
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

  const { starredModels, normalModels } = useMemo(() => {
    const starred: CatalogModel[] = []
    const normal: CatalogModel[] = []
    filtered.forEach((m) => {
      if (favorites.includes(m.id)) {
        starred.push(m)
      } else {
        normal.push(m)
      }
    })
    return { starredModels: starred, normalModels: normal }
  }, [filtered, favorites])

  const selected = models.find((m) => m.id === modelId) || models[0]
  const footerLabel = autoModel
    ? 'Auto'
    : selected
      ? selected.display_name
      : 'Select model'

  const dotColor = toolsStatus === 'degraded' ? 'bg-amber-500' : 'bg-emerald-500'
  const dotPingColor = toolsStatus === 'degraded' ? 'bg-amber-400' : 'bg-emerald-400'

  const renderModelItem = (m: CatalogModel, isStarred: boolean) => {
    const active = !autoModel && m.id === modelId
    
    let badgeStyle = 'bg-zinc-800 border border-zinc-700/50 text-zinc-400'
    if (m.badge) {
      const bLower = m.badge.toLowerCase()
      if (bLower.includes('fast') || bLower.includes('speed')) {
        badgeStyle = 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
      } else if (bLower.includes('smart') || bLower.includes('thinking') || bLower.includes('reasoning')) {
        badgeStyle = 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
      } else if (bLower.includes('max') || bLower.includes('ultra') || bLower.includes('pro')) {
        badgeStyle = 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
      }
    }

    return (
      <div
        key={m.id}
        className={`flex items-center gap-1.5 px-2.5 py-2 text-left text-[12px] transition-all duration-150 ${active ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
      >
        <button
          type="button"
          onClick={() => toggleFavorite(m.id)}
          className="shrink-0 p-1 rounded hover:bg-zinc-800 transition-colors"
          aria-label={isStarred ? 'Remove favorite' : 'Add favorite'}
        >
          <Star className={`w-3.5 h-3.5 transition-transform hover:scale-110 ${isStarred ? 'fill-amber-400 text-amber-400' : 'text-zinc-750 hover:text-zinc-550'}`} />
        </button>

        <button
          type="button"
          onClick={() => {
            onAutoModelChange(false)
            onModelIdChange(m.id)
            setOpen(false)
          }}
          className="flex-1 flex items-center justify-between gap-2 min-w-0 py-0.5 text-left"
        >
          <div className="flex flex-col min-w-0">
            <span className={`text-zinc-200 truncate ${active ? 'font-semibold text-white' : ''}`}>
              {m.display_name}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono truncate">
              {m.openrouter_model.split('/')[1] || m.openrouter_model}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {m.badge && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${badgeStyle}`}>
                {m.badge}
              </span>
            )}
            {active && <Check className="w-3.5 h-3.5 text-[#6366f1] shrink-0 ml-auto" />}
          </div>
        </button>

        <ModelInfoTooltip model={m} />
      </div>
    )
  }

  return (
    <div ref={ref} className={`relative ${compact ? '' : 'shrink-0'}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-3 text-[12px] text-zinc-350 hover:text-white border border-zinc-800/80 rounded-lg px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900/60 transition-all duration-200 shadow-md min-w-[155px]"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex h-2 w-2 shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotPingColor} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`}></span>
          </div>
          <span className="truncate font-semibold">{footerLabel}</span>
        </div>
        <span className="text-zinc-500 shrink-0 text-[10px]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-[320px] max-h-[500px] overflow-hidden flex flex-col bg-zinc-950/95 backdrop-blur-xl border border-zinc-850 rounded-xl shadow-2xl z-50 animate-reveal">
          {/* Search Header */}
          <div className="p-2 border-b border-zinc-800/50 flex items-center gap-2 bg-zinc-900/20">
            <Search className="w-4 h-4 text-zinc-500 shrink-0 ml-1.5" />
            <input
              type="text"
              placeholder="Search models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-0 outline-none text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:ring-0 p-1"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-zinc-500 hover:text-zinc-300 text-[10px] px-1.5 shrink-0"
              >
                Clear
              </button>
            )}
          </div>

          {/* Configuration Toggles */}
          <div className="p-2 border-b border-zinc-800/50 flex flex-col gap-0.5 bg-zinc-900/10">
            <ToggleSwitch
              checked={autoModel}
              onChange={onAutoModelChange}
              label="Auto-select Model"
              description="Routes task dynamically using metadata"
            />
            <ToggleSwitch
              checked={maxMode}
              onChange={onMaxModeChange}
              label="MAX Mode"
              description="Unlocks maximum intelligence models"
            />
            {showDeveloperOptions && onUseAllStepsChange && (
              <ToggleSwitch
                checked={useAllSteps}
                onChange={onUseAllStepsChange}
                label="Force Uniform Model"
                description="Runs subagents on the same selected model"
              />
            )}
          </div>

          {/* Model Lists */}
          <div className="overflow-y-auto flex-1 py-1 max-h-[260px] divide-y divide-zinc-900/25">
            {starredModels.length > 0 && (
              <div className="px-3 py-1.5 text-[9px] font-bold text-zinc-500 tracking-wider uppercase font-mono bg-zinc-900/10">
                Starred Models
              </div>
            )}
            {starredModels.map((m) => renderModelItem(m, true))}

            {normalModels.length > 0 && starredModels.length > 0 && (
              <div className="px-3 py-1.5 text-[9px] font-bold text-zinc-500 tracking-wider uppercase font-mono bg-zinc-900/10">
                Other Models
              </div>
            )}
            {normalModels.map((m) => renderModelItem(m, false))}

            {filtered.length === 0 && (
              <div className="p-4 text-center text-zinc-650 text-xs font-medium">
                No matching models found
              </div>
            )}
          </div>

          {/* Footer Section */}
          <div className="p-2.5 border-t border-zinc-800/50 flex items-center justify-between gap-2 bg-zinc-900/20 text-[10px]">
            <span className="text-zinc-500 truncate" title={`Default model is ${defaultId}`}>
              Default: <span className="font-mono text-zinc-400">{defaultId}</span>
            </span>
            <button
              type="button"
              disabled={syncing}
              onClick={() => {
                setSyncing(true)
                void loadModels(true).finally(() => setSyncing(false))
              }}
              className="text-[#818cf8] hover:text-white flex items-center gap-1 transition-colors disabled:opacity-50 shrink-0 font-medium cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

