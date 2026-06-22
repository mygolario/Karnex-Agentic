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
  const showContextPanel = store.showContextPanel


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
    <div className="flex flex-col h-screen bg-[#030303] text-white select-none overflow-hidden">
      {/* Top Header */}
      <ForgeHeader />

      {/* Main Workspace Panels */}
      <div className="flex-1 flex min-h-0 divide-x divide-zinc-900/40 overflow-hidden bg-[#030303]">
        
        {/* LEFT COLUMN: Collapsible Context & Pipeline */}
        <div 
          className={`shrink-0 flex flex-col h-full bg-[#050507] divide-y divide-zinc-900/60 overflow-y-auto forge-scroll sidebar-collapse-transition ${
            showContextPanel ? 'w-[300px] border-r border-zinc-900/40' : 'w-0 opacity-0 pointer-events-none'
          }`}
        >
          <ContextPanel />
          <div className="flex-1 min-h-0">
            <ForgeStatusBar />
          </div>
        </div>

        {/* CENTER COLUMN: Chat / Conversations Panel */}
        <div className="flex-[1] flex flex-col h-full min-w-[360px] bg-[#050507]">
          {/* Karnex action toolbar */}
          <div className="border-b border-zinc-900/50 bg-zinc-950/20 shrink-0">
            <KarnexButtons />
          </div>
          
          <div className="flex-1 flex flex-col min-h-0">
            <ChatPanel />
          </div>
        </div>

        {/* RIGHT COLUMN: Output (Preview / Code / DB Schema / Deployment) */}
        {hasOutput ? (
          <div className="flex-[1.2] flex h-full min-w-[420px] bg-[#030303] border-l border-zinc-900/40">
            <div className="flex-1 min-h-0 p-3.5 overflow-hidden flex flex-col">
              {/* Tab Content Wrapper */}
              <div className="flex-1 min-h-0 rounded-xl border border-zinc-900/60 bg-[#08080a] overflow-hidden shadow-2xl relative">
                {/* Preview Panel */}
                {activeTab === 'preview' && (
                  <PreviewPanel />
                )}

                {/* Code Panel */}
                {activeTab === 'code' && (
                  <CodePanel />
                )}

                {/* Database Schema Panel */}
                {activeTab === 'database' && (
                  <SchemaVisualizer files={builderOutput.files} />
                )}

                {/* Deployment & Guide Panel */}
                {activeTab === 'deploy' && (
                  <div className="h-full overflow-y-auto forge-scroll p-6 space-y-6 bg-zinc-950/80 backdrop-blur-sm">
                    {builderOutput.pr_url && (
                      <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between">
                        <div className="space-y-1 pr-4">
                          <h4 className="text-[12px] font-medium text-white">GitHub Repository Connected</h4>
                          <p className="text-[11px] text-zinc-400">The generated code has been pushed to a new branch in your repository.</p>
                        </div>
                        <a
                          href={builderOutput.pr_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[11px] font-semibold rounded-md px-3.5 py-2 transition-colors shrink-0 cursor-pointer shadow-md shadow-indigo-600/10"
                        >
                          Open Pull Request
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0019 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                        </a>
                      </div>
                    )}

                    {/* Setup instructions */}
                    <div className="space-y-2">
                      <h3 className="text-[11.5px] uppercase tracking-wider font-semibold text-zinc-400 font-mono">Setup Instructions</h3>
                      <div className="space-y-2">
                        {builderOutput.setup_instructions.map((inst, idx) => (
                          <div key={idx} className="bg-black/40 rounded-lg border border-zinc-900 p-3 text-[11px] font-mono text-zinc-350 select-text leading-relaxed">
                            {inst}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Improvements */}
                    <div className="space-y-2">
                      <h3 className="text-[11.5px] uppercase tracking-wider font-semibold text-zinc-400 font-mono">Suggested Improvements</h3>
                      <ul className="space-y-2.5">
                        {builderOutput.suggested_improvements.map((imp, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-[12px] text-zinc-400 leading-relaxed">
                            <span className="text-zinc-700 mt-1 shrink-0">•</span>
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Empty/Building placeholder on right, or let Center fill if not building */
          loading && (
            <div className="flex-[1.2] flex h-full min-w-[420px] bg-[#030303] border-l border-zinc-900/40 items-center justify-center p-8">
              <div className="text-center space-y-3">
                <div className="h-6 w-6 rounded-full border-2 border-zinc-800 border-t-indigo-500 animate-spin mx-auto" />
                <p className="text-[12px] text-zinc-400 font-mono">Orchestrating agent workspace...</p>
                <p className="text-[10px] text-zinc-600 max-w-[240px] mx-auto">Waiting for initial code output from compilation pipeline.</p>
              </div>
            </div>
          )
        )}

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

