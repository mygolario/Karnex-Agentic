'use client'

import React from 'react'

interface ManifestExportProps {
  manifest: Record<string, unknown> | null | undefined
  runId?: string | null
}

export default function ManifestExport({ manifest, runId }: ManifestExportProps) {
  if (!manifest) {
    return (
      <p className="text-[12px] text-zinc-600 font-mono p-4">
        Run manifest appears after a Forge run completes.
      </p>
    )
  }

  const json = JSON.stringify({ run_id: runId, ...manifest }, null, 2)

  const download = () => {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `karnex-forge-manifest-${runId || 'run'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copy = () => {
    void navigator.clipboard.writeText(json)
  }

  return (
    <div className="p-4 h-full flex flex-col min-h-0">
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={download}
          className="text-[11px] px-3 py-1.5 rounded bg-[#6366f1] text-white hover:bg-[#5558e6]"
        >
          Download JSON
        </button>
        <button
          type="button"
          onClick={copy}
          className="text-[11px] px-3 py-1.5 rounded border border-[#262626] text-zinc-400 hover:text-zinc-200"
        >
          Copy
        </button>
      </div>
      <pre className="flex-1 overflow-auto text-[10px] font-mono text-zinc-500 bg-[#050505] border border-[#141417] rounded p-3">
        {json}
      </pre>
    </div>
  )
}
