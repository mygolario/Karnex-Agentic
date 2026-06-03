'use client'

import React, { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import CodePanel from '@/components/forge/CodePanel'
import SchemaVisualizer from '@/components/forge/SchemaVisualizer'
import type { BuilderOutput, TechStack } from '@/lib/studio/types'

interface AdvancedPanelProps {
  open: boolean
  builderOutput: BuilderOutput | null
  techStack: TechStack
  githubRepo: string | null
}

export default function AdvancedPanel({
  open,
  builderOutput,
  techStack,
  githubRepo,
}: AdvancedPanelProps) {
  const supabase = createSupabaseBrowserClient()
  const [selectedFileIdx, setSelectedFileIdx] = useState(0)
  const [activeTab, setActiveTab] = useState<'files' | 'schema' | 'config'>('files')
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

  if (!open) {
    return null
  }

  return (
    <div className="border-t border-[#141417] bg-[#09090b] shrink-0 transition-all duration-300">
      <div className="flex gap-6 px-4 pt-3 border-b border-[#141417]">
        {(['files', 'schema', 'config'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`text-[12px] font-medium pb-2 cursor-pointer ${
              activeTab === tab
                ? 'text-zinc-100 border-b-2 border-[#6366f1] -mb-px'
                : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >
            {tab === 'files' ? 'Files' : tab === 'schema' ? 'Schema' : 'Stack'}
          </button>
        ))}
      </div>

      <div className="h-[320px] min-h-[240px]">
        {activeTab === 'files' && (
          files.length > 0 ? (
            <CodePanel
              files={files}
              selectedFileIdx={selectedFileIdx}
              onSelectFile={setSelectedFileIdx}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-[12px] text-zinc-600 font-mono">
              {githubMeta ? `github/${githubMeta}` : 'No files — run a build'}
            </div>
          )
        )}

        {activeTab === 'schema' && (
          files.length > 0 ? (
            <SchemaVisualizer files={files} />
          ) : (
            <div className="h-full flex items-center justify-center text-[12px] text-zinc-600">
              No schema
            </div>
          )
        )}

        {activeTab === 'config' && (
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6 font-mono text-[12px]">
            <div>
              <p className="text-zinc-600 uppercase tracking-wider text-[10px] mb-1">Framework</p>
              <p className="text-zinc-200">{stack.framework}</p>
            </div>
            <div>
              <p className="text-zinc-600 uppercase tracking-wider text-[10px] mb-1">Styling</p>
              <p className="text-zinc-200">{stack.styling}</p>
            </div>
            <div>
              <p className="text-zinc-600 uppercase tracking-wider text-[10px] mb-1">Database</p>
              <p className="text-zinc-200">{stack.database}</p>
            </div>
            <div>
              <p className="text-zinc-600 uppercase tracking-wider text-[10px] mb-1">GitHub</p>
              <p className="text-zinc-200 truncate">{githubRepo || githubMeta || '—'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
