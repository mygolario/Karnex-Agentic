'use client'

import React, { useEffect, useState } from 'react'
import { useForgeStore } from '@/lib/studio/forge-store'
import { useForgeContext } from '@/lib/studio/forge-context'
import { Clock, X, RotateCcw, AlertTriangle, FileCode } from 'lucide-react'

export default function VersionTimeline() {
  const store = useForgeStore()
  const { supabase, fetchRunOutput } = useForgeContext()
  
  const visible = store.showVersions
  const project = store.project
  const currentRunId = store.currentRunId

  const [versions, setVersions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)

  // Fetch versions from database when panel becomes visible and project is set
  useEffect(() => {
    if (!visible || !project) return
    
    async function fetchVersions() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('forge_versions')
          .select('id, version_number, diff_summary, created_at, snapshot')
          .eq('project_id', project!.id)
          .order('version_number', { ascending: false })

        if (error) throw error
        if (data) {
          setVersions(data)
        }
      } catch (err) {
        console.error('Error fetching version history:', err)
      } finally {
        setLoading(false)
      }
    }
    void fetchVersions()
  }, [visible, project, supabase])

  if (!visible) return null

  const handleClose = () => {
    store.setShowVersions(false)
    setConfirmRestore(null)
  }

  const handleRestoreClick = (vId: string) => {
    setConfirmRestore(vId)
  }

  const handleConfirmRestore = async () => {
    if (!confirmRestore) return
    setRestoring(true)
    try {
      const selectedVer = versions.find((v) => v.id === confirmRestore)
      if (selectedVer && selectedVer.snapshot) {
        // Restore snapshot back into the Zustand store
        store.setBuilderOutput(selectedVer.snapshot)
        store.setSelectedFileIdx(0)
        
        // Also update backend version using Next.js endpoint
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await fetch('/api/forge/versions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              projectId: project!.id,
              versionId: confirmRestore,
            })
          })
        }
      }
      setConfirmRestore(null)
      store.setShowVersions(false)
    } catch (err) {
      console.error('Restore failed:', err)
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="w-80 bg-[#09090b] border-l border-[#141417] flex flex-col shrink-0 h-full relative z-30 animate-in slide-in-from-right duration-250">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#141417] shrink-0">
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-indigo-400" />
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
            Version Timeline
          </span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 rounded text-zinc-650 hover:text-zinc-300 hover:bg-white/[0.03] transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto forge-scroll p-4 min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-600">
            <div className="h-5 w-5 rounded-full border-2 border-zinc-800 border-t-indigo-500 animate-spin" />
            <span className="text-[10px] font-mono">Retrieving git commits...</span>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12 text-zinc-650 space-y-1">
            <p className="text-[11px]">No project versions recorded.</p>
            <p className="text-[9px]">Deploy your project to create a version snapshot.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline connector */}
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-zinc-850" />

            <div className="space-y-4 relative">
              {versions.map((ver, idx) => {
                const isCurrent = ver.version_number === project?.currentVersion
                const fileCount = ver.snapshot?.files?.length || 0
                return (
                  <div key={ver.id} className="flex gap-3 items-start group">
                    {/* Node dot */}
                    <div className="relative z-10 mt-1 shrink-0">
                      <div
                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isCurrent
                            ? 'bg-[#6366f1] border-[#6366f1] text-white'
                            : 'bg-[#09090b] border-zinc-750 group-hover:border-zinc-550'
                        }`}
                      >
                        <span className="text-[8px] font-mono font-semibold">{ver.version_number}</span>
                      </div>
                    </div>

                    {/* Snapshot Card */}
                    <div className="flex-1 min-w-0 bg-[#0a0a0f]/40 hover:bg-[#0f0f15]/40 border border-zinc-900/60 rounded-lg p-2.5 space-y-2 transition-all">
                      <div className="space-y-0.5">
                        <p className="text-[11px] text-zinc-300 font-medium leading-relaxed break-words">
                          {ver.diff_summary || 'Deployed project build'}
                        </p>
                        <span className="text-[9px] text-zinc-600 font-mono block">
                          {new Date(ver.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-zinc-900/60 pt-2 text-[9px] text-zinc-555">
                        <span className="flex items-center gap-1">
                          <FileCode className="h-3 w-3 text-zinc-600" />
                          {fileCount} files
                        </span>
                        
                        {!isCurrent && (
                          <button
                            onClick={() => handleRestoreClick(ver.id)}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 transition-all font-medium"
                          >
                            <RotateCcw className="h-2.5 w-2.5" />
                            Rollback
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal Overlay inside the timeline bar */}
      {confirmRestore && (
        <div className="absolute inset-0 bg-[#050508]/90 z-40 p-4 flex flex-col justify-center items-center text-center space-y-4">
          <div className="h-10 w-10 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
          </div>
          <div className="space-y-1">
            <h4 className="text-[13px] font-bold text-white">Restore version?</h4>
            <p className="text-[11px] text-zinc-500 max-w-[200px]">
              This will overwrite your active files and workspace code with the selected snapshot.
            </p>
          </div>
          <div className="flex gap-2 w-full max-w-[200px]">
            <button
              onClick={() => setConfirmRestore(null)}
              disabled={restoring}
              className="flex-1 py-1.5 rounded-lg border border-zinc-900 text-[11px] font-semibold text-zinc-400 hover:text-white hover:bg-zinc-950 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmRestore}
              disabled={restoring}
              className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[11px] font-semibold text-white transition-colors"
            >
              {restoring ? 'Restoring...' : 'Rollback'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
