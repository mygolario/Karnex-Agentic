'use client'

import React from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ForgeContextProvider, useForgeContext } from '@/lib/studio/forge-context'
import { useForgeStore } from '@/lib/studio/forge-store'

// Forge components
import ForgeHeader from '@/components/forge/ForgeHeader'
import ChatPanel from '@/components/forge/ChatPanel'
import ProjectLauncher from '@/components/forge/ProjectLauncher'
import ForgeStatusBar from '@/components/forge/ForgeStatusBar'
import ContextPanel from '@/components/forge/ContextPanel'
import KarnexButtons from '@/components/forge/KarnexButtons'
import MvpDashboard from '@/components/forge/MvpDashboard'

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
  const showContextPanel = store.showContextPanel

  const hasOutput = builderOutput !== null && (builderOutput as any).sitemap !== undefined

  // Show Launcher if there is no project active and we aren't loading anything
  const showLauncher = !project && !hasOutput && !loading

  if (showLauncher) {
    return (
      <div className="flex flex-col h-screen bg-[#030303] text-white">
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

        {/* WORKSPACE DISPLAY */}
        {hasOutput ? (
          /* Scanned MVP Dashboard full-bleed */
          <div className="flex-1 min-h-0">
            <MvpDashboard />
          </div>
        ) : (
          /* Default Scanner timeline console during execution */
          <>
            {/* CENTER COLUMN: Chat / Crawling Log Panel */}
            <div className="flex-1 flex flex-col h-full min-w-[360px] bg-[#050507]">
              <div className="border-b border-zinc-900/50 bg-zinc-950/20 shrink-0">
                <KarnexButtons />
              </div>
              <div className="flex-1 flex flex-col min-h-0">
                <ChatPanel />
              </div>
            </div>

            {/* RIGHT COLUMN: Terminal Loading screen while scanning */}
            {loading && (
              <div className="flex-[1.2] flex h-full min-w-[420px] bg-[#030303] border-l border-zinc-900/40 items-center justify-center p-8">
                <div className="text-center space-y-3">
                  <div className="h-6 w-6 rounded-full border-2 border-zinc-800 border-t-indigo-500 animate-spin mx-auto" />
                  <p className="text-[12px] text-zinc-400 font-mono">Crawling Linked MVP...</p>
                  <p className="text-[10px] text-zinc-650 max-w-[240px] mx-auto">
                    Karnex is scanning pages, extracting features, and mapping copy tokens.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
