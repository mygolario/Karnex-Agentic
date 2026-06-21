'use client'

import React, { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { useForgeStore } from '@/lib/studio/forge-store'
import {
  ChevronLeft, Clock, Plus, Code2, Rocket,
  Monitor, Smartphone, Tablet, Loader2, Check,
  Copy, ExternalLink, Zap, Globe,
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
    <div className="h-12 flex items-center justify-between px-5 bg-[#0a0a0e]/90 backdrop-blur-sm border-b border-[#141417] shrink-0 relative z-20">
      {/* Left — Brand + Project */}
      <div className="flex items-center gap-2 min-w-0">
        <Link
          href="/home"
          className="flex items-center justify-center p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors shrink-0 mr-1"
          title="Back to Dashboard"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="font-display text-[15px] font-semibold text-white tracking-[-0.01em] shrink-0">
          Forge
        </span>
        <span className="text-[#262626] text-[14px] shrink-0">/</span>
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
            className="text-[13px] text-zinc-200 bg-transparent border border-indigo-500/30 rounded px-1.5 py-0.5 outline-none max-w-[180px]"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-[13px] text-zinc-400 hover:text-zinc-200 truncate max-w-[180px] transition-colors cursor-pointer"
            title="Click to rename"
          >
            {projectName || 'Untitled project'}
          </button>
        )}
      </div>

      {/* Center — Tabs */}
      <div className="absolute left-[calc(50%-32px)] -translate-x-1/2 flex items-center">
        <div className="flex items-center gap-1 relative">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[tab.id] = el }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors relative z-10 ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            )
          })}
          {/* Sliding indicator */}
          <div
            ref={indicatorRef}
            className="absolute bottom-0 h-[2px] bg-[#6366f1] rounded-full forge-tab-indicator"
            style={{ left: 0, width: 0 }}
          />
        </div>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Connection indicators */}
        <div className="hidden lg:flex items-center gap-1.5 mr-2">
          <div className="flex items-center gap-1 text-[10px]" title="GitHub">
            <GithubIcon className="h-3 w-3 text-zinc-600" />
            <span className={`h-[5px] w-[5px] rounded-full ${deploymentUrl ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
          </div>
          <div className="flex items-center gap-1 text-[10px]" title="OpenRouter">
            <Globe className="h-3 w-3 text-zinc-600" />
            <span className="h-[5px] w-[5px] rounded-full bg-emerald-500" />
          </div>
        </div>

        <button
          onClick={() => setShowVersions(!showVersions)}
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition-colors"
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
            className="flex items-center gap-1.5 border border-zinc-800 text-[12px] font-medium rounded-md px-3 py-1.5 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 transition-all"
            title="Start a new project"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden md:inline">New Project</span>
          </button>
        )}

        {/* Deploy Button — ALWAYS VISIBLE */}
        <div className="relative">
          {deployStatus === 'building' ? (
            <button
              disabled
              className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[12px] font-medium rounded-md px-3 py-1.5 cursor-wait"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Building...
            </button>
          ) : deployStatus === 'deployed' ? (
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[12px] font-medium rounded-md px-3 py-1.5">
                <Check className="h-3.5 w-3.5" />
                Live
              </div>
              <button
                onClick={handleCopyUrl}
                className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition-colors"
                title={copied ? 'Copied!' : 'Copy deploy URL'}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <a
                href={deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('deploy')}
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-[12px] font-medium rounded-md px-4 py-1.5 transition-all forge-deploy-pulse shadow-lg shadow-indigo-500/20"
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
