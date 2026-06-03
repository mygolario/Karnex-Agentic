import JSZip from 'jszip'
import type { VaultDownloadFormat, VaultRecord } from './types'
import { formatOutputAsMarkdown, getVaultTitle, slugifyFilename } from './presenters'

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export async function downloadVaultOutput(
  record: VaultRecord,
  format: VaultDownloadFormat
): Promise<void> {
  const slug = slugifyFilename(getVaultTitle(record))

  if (format === 'json') {
    const blob = new Blob([JSON.stringify(record.output, null, 2)], {
      type: 'application/json',
    })
    triggerDownload(blob, `${slug}.json`)
    return
  }

  if (format === 'markdown') {
    const md = formatOutputAsMarkdown(record)
    const blob = new Blob([md], { type: 'text/markdown' })
    triggerDownload(blob, `${slug}.md`)
    return
  }

  if (format === 'zip') {
    const files = asArray(record.output.files)
    if (!files.length) return

    const zip = new JSZip()
    for (const f of files) {
      const file = asRecord(f)
      if (!file) continue
      const path = asString(file.path, 'file.txt')
      zip.file(path, asString(file.content))
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    triggerDownload(blob, `${slug}.zip`)
  }
}
