'use client'

import React, { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import CodePanel from '@/components/forge/CodePanel'
import SchemaVisualizer from '@/components/forge/SchemaVisualizer'
import ModelPicker from './ModelPicker'
import ManifestExport from './ManifestExport'
import type { BuilderOutput, TechStack } from '@/lib/studio/types'

interface AdvancedPanelProps {
  open: boolean
  builderOutput: BuilderOutput | null
  techStack: TechStack
  githubRepo: string | null
  runId?: string | null
  modelId?: string
  autoModel?: boolean
  maxMode?: boolean
  toolsStatus?: 'ok' | 'degraded'
  onModelIdChange?: (id: string) => void
  onAutoModelChange?: (v: boolean) => void
  onMaxModeChange?: (v: boolean) => void
}

export default function AdvancedPanel({
  open,
  builderOutput,
  techStack,
  githubRepo,
  runId,
  modelId = 'karnex-forge-fast-high',
  autoModel = false,
  maxMode = false,
  toolsStatus = 'ok',
  onModelIdChange,
  onAutoModelChange,
  onMaxModeChange,
}: AdvancedPanelProps) {
  const supabase = createSupabaseBrowserClient()
  const [selectedFileIdx, setSelectedFileIdx] = useState(0)
  const [activeTab, setActiveTab] = useState<'files' | 'schema' | 'manifest'>('files')
  const [memoryStack, setMemoryStack] = useState<TechStack | null>(null)
  const [githubMeta, setGithubMeta] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: mem } = await supabase
        .from('founder_memory')
        .select('value')
        .eq('founder_id', session.user.id)
        .eq('namespace', 'builder')
        .eq('key', 'tech_stack')
        .maybeSingle()

      if (mem?.value && typeof mem.value === 'object') {
        setMemoryStack(mem.value as TechStack)
      }

      const { data: gh } = await supabase
        .from('integrations')
        .select('metadata')
        .eq('founder_id', session.user.id)
        .eq('provider', 'github')
        .eq('status', 'active')
        .maybeSingle()

      const meta = gh?.metadata as Record<string, unknown> | null
      if (meta?.repo_name) {
        setGithubMeta(String(meta.repo_name))
      } else if (meta?.github_username) {
        setGithubMeta(String(meta.github_username))
      }
    }

    load()
  }, [open, supabase])

  const files = builderOutput?.files ?? []
  const stack = memoryStack ?? techStack
  const manifest = builderOutput?.run_manifest

  if (!open) {
    return null
  }

  return (
    <div className="h-full border-t border-zinc-800/40 bg-[#0c0c0e]/90 backdrop-blur-md flex flex-col min-h-0">
      {/* Tab bar header */}
      <div className="flex items-center justify-between gap-4 px-4 py-2 border-b border-zinc-800/40 bg-[#09090b]/80 shrink-0">
        <div className="bg-zinc-950/60 p-0.5 rounded-lg border border-zinc-800/50 inline-flex gap-1">
          {(['files', 'schema', 'manifest'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 capitalize cursor-pointer ${
                activeTab === tab
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/50'
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
              }`}
            >
              {tab === 'manifest' ? 'Manifest' : tab}
            </button>
          ))}
        </div>
        <div className="text-[10px] tracking-widest text-zinc-500 uppercase font-mono">
          Developer Workspace
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex min-h-0 divide-x divide-zinc-800/40">
        {/* Left column: Active tab content */}
        <div className="flex-1 min-w-0 h-full relative p-2 bg-[#050505]/40">
          {activeTab === 'files' &&
            (files.length > 0 ? (
              <CodePanel
                files={files}
                selectedFileIdx={selectedFileIdx}
                onSelectFile={setSelectedFileIdx}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-[12px] text-zinc-500 font-mono">
                {githubMeta ? `github/${githubMeta}` : 'No files generated — run a build'}
              </div>
            ))}

          {activeTab === 'schema' &&
            (files.length > 0 ? (
              <SchemaVisualizer files={files} />
            ) : (
              <div className="h-full flex items-center justify-center text-[12px] text-zinc-500">
                No schema
              </div>
            ))}

          {activeTab === 'manifest' && (
            <div className="h-full overflow-auto">
              <ManifestExport manifest={manifest} runId={runId} />
            </div>
          )}
        </div>

        {/* Right column: Config Details & Model Picker */}
        <div className="w-[320px] shrink-0 h-full bg-[#070709]/80 overflow-y-auto p-4 flex flex-col gap-4">
          <div>
            <h4 className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase mb-2">Model Configuration</h4>
            {onModelIdChange && onAutoModelChange && onMaxModeChange && (
              <ModelPicker
                modelId={modelId}
                autoModel={autoModel}
                maxMode={maxMode}
                toolsStatus={toolsStatus}
                onModelIdChange={onModelIdChange}
                onAutoModelChange={onAutoModelChange}
                onMaxModeChange={onMaxModeChange}
              />
            )}
          </div>

          <div className="h-px bg-zinc-800/40" />

          <div>
            <h4 className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase mb-3">Project Metadata</h4>
            <div className="space-y-2.5 font-mono text-[11px]">
              <div className="flex justify-between py-1 border-b border-zinc-900/60">
                <span className="text-zinc-600">Framework</span>
                <span className="text-zinc-300 font-medium">{stack.framework}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-900/60">
                <span className="text-zinc-600">Styling</span>
                <span className="text-zinc-300 font-medium">{stack.styling}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-900/60">
                <span className="text-zinc-600">Database</span>
                <span className="text-zinc-300 font-medium">{stack.database}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-900/60">
                <span className="text-zinc-600">GitHub</span>
                <span className="text-zinc-300 truncate max-w-[180px]" title={githubRepo || githubMeta || '—'}>
                  {githubRepo || githubMeta || '—'}
                </span>
              </div>
              {builderOutput?.detected_mode && (
                <div className="flex justify-between py-1 border-b border-zinc-900/60">
                  <span className="text-zinc-600">Active Mode</span>
                  <span className="text-[#a5b4fc] font-medium capitalize">{builderOutput.detected_mode}</span>
                </div>
              )}
              {builderOutput?.project_type && (
                <div className="flex justify-between py-1">
                  <span className="text-zinc-600">Project Type</span>
                  <span className="text-zinc-300 font-medium truncate max-w-[180px]" title={builderOutput.project_type}>
                    {builderOutput.project_type}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
