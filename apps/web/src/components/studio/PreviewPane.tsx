'use client'

import React, { useState } from 'react'
import BuildChecklist from './BuildChecklist'
import ProgressTimeline from './ProgressTimeline'
import type { AgentRunLog } from '@/lib/studio/types'
import type { ForgeProjectType } from '@/lib/studio/forge-types'
import {
  Monitor,
  Smartphone,
  Lock,
  RotateCw,
  Copy,
  Check,
  ExternalLink,
  Globe
} from 'lucide-react'

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
  onReviewCode?: () => void
  onDeploy: () => Promise<void>
  onSharePreview: () => void
  deployError: string | null
  deploying: boolean
  showProgressFeed?: boolean
  hideTechnicalClutter?: boolean
  isResizing?: boolean
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
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(label)
    setTimeout(() => setCopiedText(null), 2000)
  }

  if (projectType === 'mobile_expo') {
    const expoUrl = previewUrl || 'exp://localhost:8081'
    const command = 'npx expo start --dev-client'
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05),transparent_70%)] pointer-events-none" />
        
        <div className="relative w-full max-w-md bg-[#020205]/95 border border-zinc-800/80 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.08)] flex flex-col z-10">
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-950 border-b border-zinc-900 font-mono text-[10px] text-zinc-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff5f56] opacity-75" />
              <span className="w-2 h-2 rounded-full bg-[#ffbd2e] opacity-75" />
              <span className="w-2 h-2 rounded-full bg-[#27c93f] opacity-75" />
              <span className="ml-2">bash - expo-cli</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
              <span className="text-[#818cf8] uppercase tracking-wider text-[9px] font-bold">Metro Online</span>
            </div>
          </div>

          <div className="p-5 font-mono text-left text-[11px] leading-relaxed text-zinc-300 space-y-4">
            <div>
              <span className="text-zinc-600">$</span> <span className="text-indigo-400 font-semibold">{command}</span>
              <button
                onClick={() => handleCopy(command, 'command')}
                className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-[10px] transition-colors cursor-pointer"
                title="Copy Command"
              >
                {copiedText === 'command' ? (
                  <>
                    <Check size={10} className="text-emerald-400" />
                    <span className="text-emerald-400 font-sans">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={10} />
                    <span className="font-sans">Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-zinc-500 border-t border-zinc-900/60 pt-3">
              <p className="text-zinc-400 font-semibold mb-2">› Scan the QR code to load the app in Expo Go:</p>
              <div className="flex justify-center my-2">
                <div className="p-3.5 bg-white rounded-lg flex items-center justify-center shadow-lg border border-zinc-800">
                  <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-900">
                    <rect x="2" y="2" width="6" height="6" rx="0.5" />
                    <rect x="16" y="2" width="6" height="6" rx="0.5" />
                    <rect x="2" y="16" width="6" height="6" rx="0.5" />
                    <rect x="16" y="16" width="6" height="6" rx="0.5" />
                    <circle cx="5" cy="5" r="1.5" fill="currentColor" />
                    <circle cx="19" cy="5" r="1.5" fill="currentColor" />
                    <circle cx="5" cy="19" r="1.5" fill="currentColor" />
                    <path d="M10 2h4M10 6h4M10 10h4M2 10v4M6 10v4M10 14h4M16 10v4M22 10v4M14 18h4M14 22h4" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 border-t border-zinc-900/60 pt-3">
              <span className="text-zinc-500 font-semibold">› Dev Server URL:</span>
              <div className="flex items-center justify-between bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 font-mono text-[10px] break-all">
                <span className="text-indigo-300 font-semibold">{expoUrl}</span>
                <button
                  onClick={() => handleCopy(expoUrl, 'url')}
                  className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  title="Copy URL"
                >
                  {copiedText === 'url' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                </button>
              </div>
            </div>

            {summary && (
              <div className="mt-3 border-t border-zinc-900/60 pt-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">System Spec</span>
                <p className="text-[10px] text-zinc-400 font-sans leading-relaxed line-clamp-3">{summary}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (projectType === 'api_service') {
    const swaggerHint = previewUrl
      ? `${previewUrl.replace(/\/$/, '')}/docs`
      : 'http://localhost:8000/docs'
    const swaggerUrl = previewUrl
      ? `${previewUrl.replace(/\/$/, '')}/docs`
      : 'http://localhost:8000/docs'
      
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05),transparent_70%)] pointer-events-none" />

        <div className="relative w-full max-w-md bg-[#020205]/95 border border-zinc-800/80 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.08)] flex flex-col z-10">
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-950 border-b border-zinc-900 font-mono text-[10px] text-zinc-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff5f56] opacity-75" />
              <span className="w-2 h-2 rounded-full bg-[#ffbd2e] opacity-75" />
              <span className="w-2 h-2 rounded-full bg-[#27c93f] opacity-75" />
              <span className="ml-2">http-service - fastapi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
              <span className="text-cyan-400 uppercase tracking-wider text-[9px] font-bold">Swagger Online</span>
            </div>
          </div>

          <div className="p-5 font-mono text-left text-[11px] leading-relaxed text-zinc-300 space-y-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-zinc-500 font-semibold">› Swagger / OpenAPI Interactive Documentation:</span>
              <div className="flex items-center justify-between bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 font-mono text-[10px] break-all">
                <span className="text-cyan-300 font-semibold">{swaggerHint}</span>
                <div className="flex items-center gap-2.5 ml-2">
                  <button
                    onClick={() => handleCopy(swaggerHint, 'swagger')}
                    className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    title="Copy swagger URL"
                  >
                    {copiedText === 'swagger' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  </button>
                  {previewUrl && (
                    <a
                      href={swaggerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-500 hover:text-cyan-400"
                      title="Open Docs"
                    >
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-900/60 pt-3">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-2">Simulated Live HTTP Requests</span>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between bg-zinc-950/60 px-3 py-1.5 border border-zinc-900 rounded-md">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">GET</span>
                    <span className="text-[10px] font-mono text-zinc-400">/health</span>
                  </div>
                  <span className="text-[9px] font-semibold text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> 200 OK (8ms)
                  </span>
                </div>
                <div className="flex items-center justify-between bg-zinc-950/60 px-3 py-1.5 border border-zinc-900 rounded-md">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">GET</span>
                    <span className="text-[10px] font-mono text-zinc-400">/api/v1/metrics</span>
                  </div>
                  <span className="text-[9px] font-semibold text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> 200 OK (15ms)
                  </span>
                </div>
                <div className="flex items-center justify-between bg-zinc-950/60 px-3 py-1.5 border border-zinc-900 rounded-md">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">POST</span>
                    <span className="text-[10px] font-mono text-zinc-400">/api/v1/forge/build</span>
                  </div>
                  <span className="text-[9px] font-semibold text-amber-400 font-mono flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" /> 401 Unauthorized
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-[10px] text-zinc-500 flex justify-between border-t border-zinc-900/60 pt-3">
              <span>HOST: localhost:8000</span>
              <span>Uptime: 2h 41m</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (projectType === 'infra_devops') {
    const rawLogs = summary || `$ railway up\n[INFO] Starting provision engine...\n[INFO] Reading config from railway.toml...\n[OK] Configuration loaded...\n[INFO] Resolving cloud workspace dependencies...\n[OK] 3 resources verified...\n[INFO] Applying Terraform plans...\n[OK] Cloud resources provisioned.`

    return (
      <div className="w-full h-full flex flex-col p-4 select-none relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05),transparent_70%)] pointer-events-none" />

        <div className="relative w-full h-full flex flex-col bg-[#020205]/95 border border-zinc-800/80 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.08)] z-10">
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-950 border-b border-zinc-900 font-mono text-[10px] text-zinc-500 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff5f56] opacity-75" />
              <span className="w-2 h-2 rounded-full bg-[#ffbd2e] opacity-75" />
              <span className="w-2 h-2 rounded-full bg-[#27c93f] opacity-75" />
              <span className="ml-2">engine - deployment logs</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleCopy(rawLogs, 'logs')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                title="Copy Terminal Logs"
              >
                {copiedText === 'logs' ? (
                  <>
                    <Check size={10} className="text-emerald-400" />
                    <span className="text-emerald-400 font-sans">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={10} />
                    <span className="font-sans">Copy Logs</span>
                  </>
                )}
              </button>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-emerald-400 uppercase tracking-wider text-[9px] font-bold">Active</span>
            </div>
          </div>

          <div className="flex-1 p-5 overflow-auto font-mono text-[11px] leading-relaxed text-zinc-300 text-left space-y-2">
            {rawLogs.split('\n').map((line, idx) => {
              const isCommand = line.startsWith('$') || line.startsWith('railway');
              const isError = line.toLowerCase().includes('err') || line.toLowerCase().includes('fail');
              const isOk = line.startsWith('[OK]') || line.includes('✔') || line.includes('succeeded') || line.includes('complete');
              const isInfo = line.startsWith('[INFO]');
              
              let textClass = 'text-zinc-400';
              if (isCommand) textClass = 'text-indigo-400 font-semibold';
              else if (isError) textClass = 'text-rose-400 font-medium';
              else if (isOk) textClass = 'text-emerald-400';
              else if (isInfo) textClass = 'text-cyan-400/80';

              return (
                <div key={idx} className="flex gap-2">
                  <span className="text-zinc-700 select-none w-6 text-right shrink-0">{idx + 1}</span>
                  <span className={textClass}>{line}</span>
                </div>
              )
            })}
            <div className="flex gap-2 text-zinc-400 animate-pulse">
              <span className="text-zinc-700 select-none w-6 text-right shrink-0">·</span>
              <span>█</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

function PreviewEmptyState() {
  return (
    <div className="w-full h-full bg-[#050505] p-6 flex flex-col justify-center items-center relative overflow-hidden select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03),transparent_70%)] pointer-events-none" />
      
      <div className="max-w-sm w-full space-y-6 text-center relative z-10">
        <div className="mx-auto w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <Globe size={20} className="text-indigo-400/80 animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <h5 className="text-[14px] font-semibold text-white">Interactive Sandbox</h5>
          <p className="text-[11px] text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
            Your preview environment will load dynamically here once the workspace starts build orchestration.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/60 backdrop-blur-sm space-y-3">
          <div className="flex justify-between items-center text-[10px] font-mono">
            <span className="text-zinc-500 uppercase tracking-wider">Deployment Status</span>
            <span className="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded font-semibold uppercase tracking-wider text-[8px]">
              Pending Build
            </span>
          </div>
          <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
            <div className="h-full bg-zinc-700 w-1/4 rounded-full" />
          </div>
          <p className="text-[10px] text-zinc-500 font-sans text-left leading-normal">
            Connect your target cloud provider or trigger a build trigger from the control panel.
          </p>
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
  hideTechnicalClutter = false,
  isResizing = false,
}: PreviewPaneProps) {
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [iframeKey, setIframeKey] = useState(0)

  const resolvedType =
    projectType === 'auto' ? 'web_nextjs' : projectType
  const isWeb = resolvedType === 'web_nextjs' || resolvedType === 'fullstack_monorepo'
  const displayUrl = previewUrl ? previewUrl.replace(/^https?:\/\//, '') : 'preview.karnex.app'

  const showChecklist = isBuilding && runId
  const showIframe = isWeb && !isBuilding && previewUrl && buildComplete
  const showAltPreview =
    !isWeb && (buildComplete || !!builderSummary) && !showChecklist

  return (
    <div className="flex flex-col h-full bg-[#0a0a0e] border border-[#141417] rounded-lg overflow-hidden min-h-0">
      <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-2.5 border-b border-[#141417] bg-[#09090b]">
        <div className="flex gap-2 shrink-0">
          <div className="h-[11px] w-[11px] rounded-full bg-[#ff5f56] border border-[#e0443e]/55 opacity-90 transition-opacity hover:opacity-100 shadow-sm" />
          <div className="h-[11px] w-[11px] rounded-full bg-[#ffbd2e] border border-[#dfa123]/55 opacity-90 transition-opacity hover:opacity-100 shadow-sm" />
          <div className="h-[11px] w-[11px] rounded-full bg-[#27c93f] border border-[#1aab30]/55 opacity-90 transition-opacity hover:opacity-100 shadow-sm" />
        </div>

        <div className="flex-1 max-w-xl flex items-center gap-2.5 bg-[#030305]/95 border border-zinc-900 hover:border-zinc-800/80 rounded-lg px-3.5 py-1.5 min-w-0 transition-colors shadow-inner">
          <Lock size={11} className="text-emerald-500/70 shrink-0" />
          <div className="flex-1 flex items-center font-mono text-[11px] select-all truncate">
            <span className="text-zinc-600 select-none">https://</span>
            <span className="text-zinc-300 font-semibold">{displayUrl}</span>
          </div>
          
          <button
            type="button"
            onClick={() => setIframeKey((k) => k + 1)}
            className={`text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer shrink-0 ${isBuilding ? 'animate-spin text-indigo-400' : 'hover:rotate-180 duration-500'}`}
            title="Reload Preview"
          >
            <RotateCw size={11} />
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isWeb && (
            <div className="flex bg-zinc-950 border border-zinc-900 rounded-lg p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setViewport('desktop')}
                className={`flex items-center justify-center p-1.5 rounded-md transition-all cursor-pointer ${
                  viewport === 'desktop'
                    ? 'bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                }`}
                title="Desktop Viewport"
              >
                <Monitor size={12} />
              </button>
              <button
                type="button"
                onClick={() => setViewport('mobile')}
                className={`flex items-center justify-center p-1.5 rounded-md transition-all cursor-pointer ${
                  viewport === 'mobile'
                    ? 'bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                }`}
                title="Mobile Viewport"
              >
                <Smartphone size={12} />
              </button>
            </div>
          )}
          
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-1.5 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 shadow-sm transition-colors"
              title="Open Live Preview in New Tab"
            >
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      <div className="flex-1 relative min-h-0 bg-[#050505] flex items-center justify-center p-4 overflow-y-auto">
        <div
          className={`relative h-full transition-all duration-500 flex items-center justify-center ${
            isWeb && viewport === 'mobile' 
              ? 'w-[375px] max-w-full rounded-[2.5rem] border-[10px] border-zinc-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden bg-zinc-950 ring-1 ring-zinc-800/80 p-0' 
              : 'w-full'
          } ${showIframe || showAltPreview ? 'opacity-100' : showChecklist ? 'opacity-0' : 'opacity-100'}`}
        >
          {showIframe ? (
            <iframe
              key={iframeKey}
              src={previewUrl!}
              title="Preview"
              className={`w-full h-full border-0 rounded-md bg-white ${isResizing ? 'pointer-events-none' : ''}`}
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
            className={`absolute inset-4 transition-opacity duration-300 ${buildComplete ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            {hideTechnicalClutter ? (
              <div className="flex flex-col items-center justify-center h-full bg-[#0c0c12]/85 backdrop-blur-md border border-zinc-800/40 rounded-xl p-8 text-center space-y-4">
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <div className="absolute w-10 h-10 rounded-full bg-indigo-500/10 animate-ping" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-zinc-200 font-semibold text-[14px]">Building your application...</h3>
                  <p className="text-zinc-500 text-[12px] max-w-sm">Karnex is configuring your server, database schemas, and compiling modules.</p>
                </div>
                <div className="text-[11px] font-mono text-zinc-400 bg-zinc-950/60 px-3 py-1.5 rounded-md border border-zinc-900">
                  Status: {runStatus.toUpperCase()}
                </div>
              </div>
            ) : (
              <BuildChecklist status={runStatus} logs={runLogs} />
            )}
          </div>
        )}
      </div>

      {deployError && (
        <div className="shrink-0 px-4 py-2.5 bg-amber-500/10 border-t border-amber-500/20 text-[12px] text-amber-300 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>{deployError}</span>
          {!vercelConnected && (
            <a href="/integrations" className="underline hover:text-amber-200 ml-1">
              Connect Vercel first
            </a>
          )}
        </div>
      )}

      {showProgressFeed && runLogs.length > 0 && <ProgressTimeline logs={runLogs} />}

      <div className={`shrink-0 grid ${onReviewCode ? 'grid-cols-3' : 'grid-cols-2'} gap-2.5 p-3 border-t border-[#141417] bg-[#09090b]`}>
        <button
          type="button"
          onClick={() => void onDeploy()}
          disabled={deploying || !isWeb}
          className="text-[12px] font-semibold text-white bg-[#6366f1] hover:bg-[#5558e6] disabled:opacity-50 py-2.5 rounded-lg transition-all shadow-[0_4px_12px_rgba(99,102,241,0.2)] hover:shadow-[0_4px_16px_rgba(99,102,241,0.35)] cursor-pointer disabled:pointer-events-none active:scale-[0.98]"
        >
          {deploying ? 'Deploying...' : isWeb ? 'Deploy to Vercel' : 'Deploy N/A'}
        </button>
        {onReviewCode && (
          <button
            type="button"
            onClick={onReviewCode}
            className="text-[12px] font-semibold text-zinc-300 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 py-2.5 rounded-lg transition-all cursor-pointer active:scale-[0.98]"
          >
            Review Code
          </button>
        )}
        <button
          type="button"
          onClick={onSharePreview}
          disabled={!previewUrl}
          className="text-[12px] font-semibold text-zinc-300 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 disabled:opacity-40 py-2.5 rounded-lg transition-all cursor-pointer active:scale-[0.98] disabled:pointer-events-none"
        >
          Share Preview URL
        </button>
      </div>
    </div>
  )
}
