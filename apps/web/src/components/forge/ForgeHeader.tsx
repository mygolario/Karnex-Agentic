'use client'

import React, { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { useForgeStore } from '@/lib/studio/forge-store'
import {
  ChevronLeft, Clock, Plus, Code2, Rocket,
  Monitor, Smartphone, Tablet, Loader2, Check,
  Copy, ExternalLink, Zap, Globe, PanelLeftClose, PanelLeft,
} from 'lucide-react'

const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
)

const tabs = [
  { id: 'preview' as const, label: 'Live Preview', icon: Monitor },
  { id: 'code' as const, label: 'Code', icon: Code2 },
  { id: 'database' as const, label: 'Database Schema', icon: Zap },
  { id: 'deploy' as const, label: 'Deploy', icon: Rocket },
]

export default function ForgeHeader() {
  const activeTab = useForgeStore((s) => s.activeTab)
  const setActiveTab = useForgeStore((s) => s.setActiveTab)
  const projectName = useForgeStore((s) => s.projectName)
  const setProjectName = useForgeStore((s) => s.setProjectName)
  const showVersions = useForgeStore((s) => s.showVersions)
  const setShowVersions = useForgeStore((s) => s.setShowVersions)
  const loading = useForgeStore((s) => s.loading)
  const builderOutput = useForgeStore((s) => s.builderOutput)
  const currentRunStatus = useForgeStore((s) => s.currentRunStatus)
  const showContextPanel = useForgeStore((s) => s.showContextPanel)
  const setShowContextPanel = useForgeStore((s) => s.setShowContextPanel)

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(projectName)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const indicatorRef = useRef<HTMLDivElement>(null)

  // Sync editName with store
  useEffect(() => {
    setEditName(projectName)
  }, [projectName])

  // Tab indicator animation
  useEffect(() => {
    const activeEl = tabRefs.current[activeTab]
    const indicator = indicatorRef.current
    if (activeEl && indicator) {
      indicator.style.left = `${activeEl.offsetLeft}px`
      indicator.style.width = `${activeEl.offsetWidth}px`
    }
  }, [activeTab])

  // Focus input on edit
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleNameSave = () => {
    setEditing(false)
    if (editName.trim()) {
      setProjectName(editName.trim())
    }
  }

  const hasOutput = !!builderOutput && builderOutput.files.length > 0
  const deploymentUrl = builderOutput?.pr_url

  const handleCopyUrl = () => {
    if (deploymentUrl) {
      navigator.clipboard.writeText(deploymentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Derive deploy status
  const deployStatus: 'idle' | 'building' | 'deployed' = loading
    ? 'building'
    : currentRunStatus === 'success' && deploymentUrl
      ? 'deployed'
      : 'idle'

  return (
    <div className="h-14 flex items-center justify-between px-5 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 shrink-0 relative z-20">
      {/* Left — Brand + Project */}
      <div className="flex items-center gap-2 min-w-0">
        <Link
          href="/home"
          className="flex items-center justify-center p-1.5 rounded-md text-zinc-550 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors shrink-0 mr-1"
          title="Back to Dashboard"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        
        {/* Collapsible Sidebar Toggle Button */}
        <button
          onClick={() => setShowContextPanel(!showContextPanel)}
          className="p-1.5 rounded-md text-zinc-550 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors shrink-0 cursor-pointer mr-2"
          title={showContextPanel ? "Hide left panel" : "Show left panel"}
        >
          {showContextPanel ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </button>

        <span className="font-display text-[14px] font-bold text-white tracking-tight shrink-0">
          Forge
        </span>
        <span className="text-zinc-800 text-[14px] shrink-0 font-light">/</span>
        {editing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSave()
              if (e.key === 'Escape') { setEditing(false); setEditName(projectName) }
            }}
            className="text-[12.5px] text-zinc-200 bg-[#0c0c0f] border border-zinc-800 rounded px-2 py-0.5 outline-none max-w-[180px] font-medium"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-[12.5px] text-zinc-400 hover:text-zinc-200 truncate max-w-[180px] transition-colors cursor-pointer font-medium"
            title="Click to rename"
          >
            {projectName || 'Untitled project'}
          </button>
        )}
      </div>

      {/* Center — Tabs Switcher */}
      <div className="absolute left-[calc(50%-32px)] -translate-x-1/2 flex items-center">
        <div className="flex items-center gap-0.5 bg-[#030303] border border-zinc-900 rounded-lg p-0.5 relative shadow-inner">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isTabActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[tab.id] = el }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded-md transition-all relative z-10 cursor-pointer ${
                  isTabActive
                    ? 'text-white bg-zinc-900 border border-zinc-800/80 shadow-md font-semibold'
                    : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Connection indicators */}
        <div className="hidden lg:flex items-center gap-2.5 mr-3 border-r border-zinc-900 pr-3.5 py-1">
          <div className="flex items-center gap-1 text-[10px]" title="GitHub connected">
            <GithubIcon className="h-3.5 w-3.5 text-zinc-500" />
            <span className={`h-1.5 w-1.5 rounded-full ${deploymentUrl ? 'bg-emerald-500' : 'bg-zinc-850'}`} />
          </div>
          <div className="flex items-center gap-1 text-[10px]" title="OpenRouter available">
            <Globe className="h-3.5 w-3.5 text-zinc-500" />
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
        </div>

        <button
          onClick={() => setShowVersions(!showVersions)}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${showVersions ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'}`}
          title="Version history"
        >
          <Clock className="h-4 w-4" />
        </button>

        {hasOutput && (
          <button
            onClick={() => {
              useForgeStore.getState().reset()
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('karnex-workspace-new', 'true')
              }
            }}
            className="flex items-center gap-1.5 border border-zinc-800 text-[11.5px] font-medium rounded-lg px-3 py-1.5 bg-[#0e0e11] hover:bg-zinc-900 text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
            title="Start a new project"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden md:inline">New Project</span>
          </button>
        )}

        {/* Deploy Button */}
        <div className="relative">
          {deployStatus === 'building' ? (
            <button
              disabled
              className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[11.5px] font-medium rounded-lg px-3 py-1.5 cursor-wait"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Building...
            </button>
          ) : deployStatus === 'deployed' ? (
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11.5px] font-medium rounded-lg px-3 py-1.5">
                <Check className="h-3.5 w-3.5" />
                Live
              </div>
              <button
                onClick={handleCopyUrl}
                className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition-colors cursor-pointer"
                title={copied ? 'Copied!' : 'Copy deploy URL'}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <a
                href={deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition-colors cursor-pointer"
                title="Open in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('deploy')}
              className="flex items-center gap-1.5 bg-white hover:bg-zinc-200 text-black text-[11.5px] font-semibold rounded-lg px-4 py-1.5 transition-all shadow-md cursor-pointer"
            >
              <Rocket className="h-3.5 w-3.5" />
              Deploy
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
