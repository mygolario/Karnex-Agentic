'use client'

import React from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ForgeContextProvider, useForgeContext } from '@/lib/studio/forge-context'
import { useForgeStore } from '@/lib/studio/forge-store'

// Forge components
import ForgeHeader from '@/components/forge/ForgeHeader'
import ChatPanel from '@/components/forge/ChatPanel'
import PreviewPanel from '@/components/forge/PreviewPanel'
import CodePanel from '@/components/forge/CodePanel'
import SchemaVisualizer from '@/components/forge/SchemaVisualizer'
import ProjectLauncher from '@/components/forge/ProjectLauncher'
import ForgeStatusBar from '@/components/forge/ForgeStatusBar'
import VersionTimeline from '@/components/forge/VersionTimeline'
import VisualEditPanel from '@/components/forge/VisualEditPanel'
import ContextPanel from '@/components/forge/ContextPanel'
import KarnexButtons from '@/components/forge/KarnexButtons'

export default function ForgePage() {
  return (
    <ErrorBoundary>
      <ForgeContextProvider>
        <ForgeWorkspace />
      </ForgeContextProvider>
    </ErrorBoundary>
  )
}

function ForgeWorkspace() {
  const store = useForgeStore()
  
  const project = store.project
  const builderOutput = store.builderOutput
  const loading = store.loading
  const activeTab = store.activeTab
  const showVersions = store.showVersions
  const showVisualEdit = store.showVisualEdit

  const hasOutput = builderOutput !== null && builderOutput.files.length > 0

  // Show Launcher if there is no project active and we aren't loading anything
  const showLauncher = !project && !hasOutput && !loading

  if (showLauncher) {
    return (
      <div className="flex flex-col h-screen bg-[#050505] text-white">
        <ForgeHeader />
        <div className="flex-1 min-h-0">
          <ProjectLauncher />
        </div>
      </div>
    )
  }

  return (
    <div className="forge-mission-control text-white select-none">
      {/* Top Header */}
      <ForgeHeader />

      {/* Main Workspace Panels */}
      <div className="flex-1 flex min-h-0 divide-x divide-zinc-900/60 overflow-hidden bg-[#050507]">
        
        {/* LEFT COLUMN (320px): Context, Status, Actions */}
        <div className="w-[320px] shrink-0 flex flex-col h-full bg-[#07070a]/45 backdrop-blur-md divide-y divide-zinc-900/60 overflow-y-auto forge-scroll">
          <ContextPanel />
          <div className="flex-1 min-h-0">
            <ForgeStatusBar />
          </div>
        </div>

        {/* CENTER COLUMN (flex-1): Prompts, Code Editor */}
        <div className="flex-[1.2] flex flex-col h-full min-w-[360px] bg-[#08080c]/30">
          {/* Karnex action buttons */}
          <div className="border-b border-[#141417] bg-[#0c0c0f]/40 shrink-0">
            <KarnexButtons />
          </div>
          
          <div className="flex-1 flex flex-col min-h-0">
            {/* Prompt Bar (ChatPanel handles prompt + chat log) */}
            <div className="flex-1 min-h-0">
              <ChatPanel />
            </div>

            {/* Code Panel (only show if we have outputs) */}
            {hasOutput && (
              <div className="h-[50%] border-t border-zinc-900/60">
                <CodePanel />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (flex-1): Viewport Previews, DB schema, Deployments */}
        <div className="flex-1 flex h-full min-w-[360px] bg-[#050507]">
          <div className="flex-1 min-h-0 p-2 overflow-hidden">
            {/* Preview Panel */}
            {activeTab === 'preview' && (
              <PreviewPanel />
            )}

            {/* Database Schema Panel */}
            {activeTab === 'database' && hasOutput && (
              <SchemaVisualizer files={builderOutput.files} />
            )}

            {/* Deployment & Guide Panel */}
            {activeTab === 'deploy' && hasOutput && (
              <div className="h-full overflow-y-auto forge-scroll rounded-lg border border-zinc-900 bg-[#0a0a0e] p-6 space-y-6">
                {builderOutput.pr_url && (
                  <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-[12px] font-medium text-white">GitHub Repository Connected</h4>
                      <p className="text-[11px] text-zinc-400">The generated code has been pushed to a new branch in your repository.</p>
                    </div>
                    <a
                      href={builderOutput.pr_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-[#6366f1] hover:bg-[#5558e6] text-white text-[11px] font-medium rounded-md px-3 py-1.5 transition-colors shrink-0 cursor-pointer"
                    >
                      Open Pull Request
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0019 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>
                  </div>
                )}

                {/* Setup instructions */}
                <div>
                  <h3 className="text-[12px] font-medium text-zinc-200">Setup Instructions</h3>
                  <div className="mt-2 space-y-1.5">
                    {builderOutput.setup_instructions.map((inst, idx) => (
                      <div key={idx} className="bg-zinc-950 rounded border border-zinc-900 p-2.5 text-[11px] font-mono text-zinc-400">
                        {inst}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Improvements */}
                <div>
                  <h3 className="text-[12px] font-medium text-zinc-200">Suggested Improvements</h3>
                  <ul className="mt-2 space-y-1">
                    {builderOutput.suggested_improvements.map((imp, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-[11px] text-zinc-400">
                        <span className="text-zinc-700 mt-0.5 shrink-0">—</span>
                        {imp}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Visual Edit Property Sidebar Panel */}
        {showVisualEdit && (
          <VisualEditPanel />
        )}

        {/* Version History Sidebar Timeline */}
        {showVersions && (
          <VersionTimeline />
        )}

      </div>
    </div>
  )
}
