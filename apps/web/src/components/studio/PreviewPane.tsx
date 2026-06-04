'use client'

import React, { useState } from 'react'
import BuildChecklist from './BuildChecklist'
import ProgressTimeline from './ProgressTimeline'
import type { AgentRunLog } from '@/lib/studio/types'
import type { ForgeProjectType } from '@/lib/studio/forge-types'

type Viewport = 'desktop' | 'mobile'

interface PreviewPaneProps {
  previewUrl: string | null
  isBuilding: boolean
  buildComplete: boolean
  runId: string | null
  runStatus: string
  runLogs: AgentRunLog[]
  vercelConnected: boolean
  projectType?: ForgeProjectType
  builderSummary?: string | null
  onReviewCode: () => void
  onDeploy: () => Promise<void>
  onSharePreview: () => void
  deployError: string | null
  deploying: boolean
  showProgressFeed?: boolean
}

function ProjectTypePreview({
  projectType,
  previewUrl,
  summary,
}: {
  projectType: ForgeProjectType
  previewUrl: string | null
  summary?: string | null
}) {
  if (projectType === 'mobile_expo') {
    const expoUrl = previewUrl || 'exp://localhost:8081'
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
        <p className="text-[13px] font-semibold text-white mb-2">Expo / Mobile preview</p>
        <p className="text-[11px] text-zinc-500 mb-4 max-w-sm">
          Run <code className="text-zinc-400">npx expo start</code> locally or open Expo Go with your dev server URL.
        </p>
        <a
          href={expoUrl.startsWith('http') ? expoUrl : `https://expo.dev`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] text-[#818cf8] underline font-mono break-all"
        >
          {expoUrl}
        </a>
        {summary && (
          <p className="mt-4 text-[11px] text-zinc-600 max-w-md line-clamp-4">{summary}</p>
        )}
      </div>
    )
  }

  if (projectType === 'api_service') {
    const swaggerHint = previewUrl
      ? `${previewUrl.replace(/\/$/, '')}/docs`
      : '/api/docs or /swagger'
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6">
        <p className="text-[13px] font-semibold text-white mb-2">API service preview</p>
        <p className="text-[11px] text-zinc-500 mb-3">OpenAPI / Swagger when the service is running:</p>
        <span className="text-[12px] font-mono text-[#a5b4fc] bg-[#6366f1]/10 px-3 py-2 rounded">
          {swaggerHint}
        </span>
        <p className="mt-4 text-[10px] text-zinc-600">
          Health: GET /health · Routes under /api/v1
        </p>
      </div>
    )
  }

  if (projectType === 'infra_devops') {
    return (
      <div className="w-full h-full flex flex-col p-6 overflow-auto">
        <p className="text-[13px] font-semibold text-white mb-2">Infra / DevOps output</p>
        <p className="text-[11px] text-zinc-500 mb-4">
          Review generated Terraform, Railway, or CI configs in Advanced → Files. Deploy via your provider CLI.
        </p>
        <div className="border border-dashed border-[#262626] rounded-lg p-4 font-mono text-[11px] text-zinc-500 text-left">
          <p>railway up</p>
          <p className="mt-2 text-zinc-600"># or terraform plan / apply</p>
        </div>
        {summary && (
          <pre className="mt-4 text-[10px] text-zinc-600 whitespace-pre-wrap">{summary.slice(0, 800)}</pre>
        )}
      </div>
    )
  }

  return null
}

function PreviewEmptyState() {
  return (
    <div className="w-full h-full bg-[#050505] p-6 flex flex-col">
      <div className="flex items-center justify-between border-b border-[#141417] pb-4 mb-4">
        <span className="font-semibold text-white text-[14px]">Preview</span>
        <span className="text-[11px] text-[#6366f1] bg-[#6366f1]/10 px-2 py-0.5 rounded">
          Placeholder
        </span>
      </div>
      <div className="flex-1 flex flex-col justify-center py-6 space-y-3 max-w-sm mx-auto w-full">
        <div className="border border-[#141417] bg-[#0a0a0e] rounded-lg p-4 flex justify-between items-center">
          <div>
            <p className="text-[13px] font-semibold text-white">Feature preview</p>
            <p className="text-[11px] text-zinc-600">Deploy or build to see live URL</p>
          </div>
          <span className="text-[13px] font-bold text-emerald-400 font-mono">—</span>
        </div>
        <div className="border border-dashed border-[#262626] rounded-lg p-8 text-center">
          <p className="text-[12px] text-zinc-600">Connect Vercel or run a build to load preview</p>
        </div>
      </div>
    </div>
  )
}

export default function PreviewPane({
  previewUrl,
  isBuilding,
  buildComplete,
  runId,
  runStatus,
  runLogs,
  vercelConnected,
  projectType = 'auto',
  builderSummary,
  onReviewCode,
  onDeploy,
  onSharePreview,
  deployError,
  deploying,
  showProgressFeed = false,
}: PreviewPaneProps) {
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [iframeKey, setIframeKey] = useState(0)

  const resolvedType =
    projectType === 'auto' ? 'web_nextjs' : projectType
  const isWeb = resolvedType === 'web_nextjs' || resolvedType === 'fullstack_monorepo'
  const displayUrl = previewUrl || 'preview.karnex.app'

  const showChecklist = isBuilding && runId
  const showIframe = isWeb && !isBuilding && previewUrl && buildComplete
  const showAltPreview =
    !isWeb && (buildComplete || !!builderSummary) && !showChecklist

  return (
    <div className="flex flex-col h-full bg-[#0a0a0e] border border-[#141417] rounded-lg overflow-hidden min-h-0">
      <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-[#141417] bg-[#09090b]">
        <div className="flex gap-1.5">
          <div className="h-[10px] w-[10px] rounded-full forge-dot-red opacity-80" />
          <div className="h-[10px] w-[10px] rounded-full forge-dot-yellow opacity-80" />
          <div className="h-[10px] w-[10px] rounded-full forge-dot-green opacity-80" />
        </div>
        <div className="flex-1 flex items-center gap-2 bg-[#050505] border border-[#141417] rounded-md px-3 py-1 min-w-0">
          <span className="text-[11px] font-mono text-zinc-600 truncate">{displayUrl}</span>
          {resolvedType !== 'web_nextjs' && (
            <span className="text-[9px] text-zinc-600 shrink-0 uppercase">{resolvedType.replace('_', ' ')}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIframeKey((k) => k + 1)}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 px-2 py-1 cursor-pointer"
          title="Refresh"
        >
          ↻
        </button>
        {isWeb && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`text-[10px] px-2 py-1 rounded ${viewport === 'desktop' ? 'bg-white/[0.06] text-zinc-200' : 'text-zinc-600'}`}
            >
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`text-[10px] px-2 py-1 rounded ${viewport === 'mobile' ? 'bg-white/[0.06] text-zinc-200' : 'text-zinc-600'}`}
            >
              Mobile
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 relative min-h-0 bg-[#050505] flex items-center justify-center p-2">
        <div
          className={`relative h-full transition-all duration-300 ${
            isWeb && viewport === 'mobile' ? 'w-[375px] max-w-full' : 'w-full'
          } ${showIframe || showAltPreview ? 'opacity-100' : showChecklist ? 'opacity-0' : 'opacity-100'}`}
        >
          {showIframe ? (
            <iframe
              key={iframeKey}
              src={previewUrl!}
              title="Preview"
              className="w-full h-full border-0 rounded-md bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          ) : showAltPreview ? (
            <ProjectTypePreview
              projectType={resolvedType as ForgeProjectType}
              previewUrl={previewUrl}
              summary={builderSummary}
            />
          ) : (
            <PreviewEmptyState />
          )}
        </div>

        {showChecklist && runId && (
          <div
            className={`absolute inset-2 transition-opacity duration-300 ${buildComplete ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <BuildChecklist status={runStatus} logs={runLogs} />
          </div>
        )}
      </div>

      {deployError && (
        <div className="shrink-0 px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 text-[12px] text-amber-300">
          {deployError}{' '}
          {!vercelConnected && (
            <a href="/integrations" className="underline hover:text-amber-200">
              Connect Vercel first
            </a>
          )}
        </div>
      )}

      {showProgressFeed && runLogs.length > 0 && <ProgressTimeline logs={runLogs} />}

      <div className="shrink-0 grid grid-cols-3 gap-2 p-3 border-t border-[#141417] bg-[#09090b]">
        <button
          type="button"
          onClick={() => void onDeploy()}
          disabled={deploying || !isWeb}
          className="text-[12px] font-semibold text-white bg-[#6366f1] hover:bg-[#5558e6] py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          {deploying ? 'Deploying...' : isWeb ? 'Deploy to Vercel' : 'Deploy N/A'}
        </button>
        <button
          type="button"
          onClick={onReviewCode}
          className="text-[12px] font-semibold text-zinc-300 bg-[#0a0a0e] border border-[#141417] hover:border-[#262626] py-2.5 rounded-lg transition-colors cursor-pointer"
        >
          Review Code
        </button>
        <button
          type="button"
          onClick={onSharePreview}
          disabled={!previewUrl}
          className="text-[12px] font-semibold text-zinc-300 bg-[#0a0a0e] border border-[#141417] hover:border-[#262626] py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
        >
          Share Preview URL
        </button>
      </div>
    </div>
  )
}
