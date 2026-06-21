'use client'

import React, { useMemo, useState } from 'react'
import { useForgeStore } from '@/lib/studio/forge-store'
import { Search, Copy, Check, Edit2, Eye, RefreshCw } from 'lucide-react'

function getBasename(filePath: string): string {
  return filePath.split('/').pop() || filePath
}

function FileIcon({ language }: { language: string }) {
  const cls = 'h-3.5 w-3.5 shrink-0'
  switch (language) {
    case 'tsx':
    case 'jsx':
    case 'typescript':
    case 'javascript':
      return (
        <svg className={`${cls} text-cyan-500/70`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25" />
        </svg>
      )
    case 'sql':
      return (
        <svg className={`${cls} text-emerald-500/70`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
        </svg>
      )
    case 'css':
      return (
        <svg className={`${cls} text-purple-500/70`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
        </svg>
      )
    default:
      return (
        <svg className={`${cls} text-zinc-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )
  }
}

function highlightCode(code: string, language: string): string {
  let escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const placeholders: string[] = []

  // Extract comments
  escaped = escaped.replace(/(\/\*[\s\S]*?\*\/|\/\/.*$)/gm, (match) => {
    placeholders.push(`<span class="syn-cmt">${match}</span>`)
    return `___PLACEHOLDER_${placeholders.length - 1}___`
  })

  // Extract strings
  escaped = escaped.replace(/(&quot;.*?&quot;|'[^']*?'|`[^`]*?`|"[^"]*")/g, (match) => {
    placeholders.push(`<span class="syn-str">${match}</span>`)
    return `___PLACEHOLDER_${placeholders.length - 1}___`
  })

  // Keywords
  const keywords = ['import', 'export', 'default', 'from', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'interface', 'type', 'extends', 'implements', 'async', 'await', 'new', 'throw', 'try', 'catch', 'finally', 'switch', 'case', 'break', 'continue', 'typeof', 'instanceof', 'void', 'null', 'undefined', 'true', 'false', 'as', 'in', 'of']

  if (language === 'sql') {
    keywords.push('SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'ON', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'AND', 'OR', 'NOT', 'NULL', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'DEFAULT', 'CASCADE', 'TEXT', 'INTEGER', 'BOOLEAN', 'TIMESTAMP', 'UUID', 'SERIAL', 'BIGINT', 'VARCHAR', 'IF', 'EXISTS', 'ENABLE', 'ROW', 'LEVEL', 'SECURITY', 'POLICY', 'USING', 'WITH', 'CHECK', 'GRANT', 'ALL', 'PRIVILEGES', 'TO')
  }

  const kwPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g')
  escaped = escaped.replace(kwPattern, '<span class="syn-kw">$1</span>')
  escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="syn-num">$1</span>')

  for (let i = placeholders.length - 1; i >= 0; i--) {
    escaped = escaped.replace(`___PLACEHOLDER_${i}___`, placeholders[i])
  }

  return escaped
}

interface CodeFile {
  path: string
  content: string
  language: string
  description: string
}

interface CodePanelProps {
  files?: CodeFile[]
  selectedFileIdx?: number
  onSelectFile?: (idx: number) => void
}

export default function CodePanel({
  files: propsFiles,
  selectedFileIdx: propsSelectedFileIdx,
  onSelectFile: propsOnSelectFile,
}: CodePanelProps = {}) {
  const storeBuilderOutput = useForgeStore((s) => s.builderOutput)
  const storeSetBuilderOutput = useForgeStore((s) => s.setBuilderOutput)
  const storeSelectedFileIdx = useForgeStore((s) => s.selectedFileIdx)
  const storeSetSelectedFileIdx = useForgeStore((s) => s.setSelectedFileIdx)

  const files = propsFiles !== undefined ? propsFiles : (storeBuilderOutput?.files || [])
  const selectedFileIdx = propsSelectedFileIdx !== undefined ? propsSelectedFileIdx : storeSelectedFileIdx
  const setSelectedFileIdx = propsOnSelectFile !== undefined ? propsOnSelectFile : storeSetSelectedFileIdx
  const setBuilderOutput = storeSetBuilderOutput
  const builderOutput = storeBuilderOutput

  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const [editable, setEditable] = useState(false)
  const [diffMode, setDiffMode] = useState(false)
  const [editContent, setEditContent] = useState('')



  // Filter files by search
  const filteredFiles = useMemo(() => {
    return files.map((f, i) => ({ ...f, originalIdx: i }))
      .filter(f => f.path.toLowerCase().includes(search.toLowerCase()) || f.description.toLowerCase().includes(search.toLowerCase()))
  }, [files, search])

  // Get active file
  const activeFile = files[selectedFileIdx]

  // Backup original content when editing starts
  const [originalContents, setOriginalContents] = useState<Record<string, string>>({})

  // Initialize editing content
  React.useEffect(() => {
    if (activeFile) {
      setEditContent(activeFile.content)
      if (originalContents[activeFile.path] === undefined) {
        setOriginalContents(prev => ({ ...prev, [activeFile.path]: activeFile.content }))
      }
    }
  }, [selectedFileIdx, activeFile])

  const handleContentChange = (newVal: string) => {
    setEditContent(newVal)
    if (builderOutput) {
      const updatedFiles = [...builderOutput.files]
      updatedFiles[selectedFileIdx] = {
        ...updatedFiles[selectedFileIdx],
        content: newVal
      }
      setBuilderOutput({
        ...builderOutput,
        files: updatedFiles
      })
    }
  }

  const handleCopy = () => {
    if (activeFile) {
      navigator.clipboard.writeText(activeFile.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleReset = () => {
    if (activeFile && originalContents[activeFile.path] !== undefined) {
      handleContentChange(originalContents[activeFile.path])
    }
  }

  const lines = useMemo(() => {
    if (diffMode && activeFile && originalContents[activeFile.path]) {
      return originalContents[activeFile.path].split('\n')
    }
    return editContent.split('\n')
  }, [editContent, diffMode, activeFile, originalContents])

  const highlightedCode = useMemo(() => {
    const codeToShow = diffMode && activeFile && originalContents[activeFile.path]
      ? originalContents[activeFile.path]
      : editContent
    return highlightCode(codeToShow, activeFile?.language || 'typescript')
  }, [editContent, diffMode, activeFile, originalContents])

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0a0e]/60 backdrop-blur-md rounded-lg border border-[#141417]/80">
        <span className="text-[13px] text-zinc-600">No files generated yet</span>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-[#0a0a0e]/60 backdrop-blur-md rounded-lg overflow-hidden border border-[#141417]/80 shadow-[0_0_20px_rgba(99,102,241,0.03)] hover:shadow-[0_0_30px_rgba(99,102,241,0.07)] transition-all duration-300">
      {/* File Tree Explorer (left) */}
      <div className="w-[180px] bg-[#09090b] border-r border-[#141417] flex flex-col shrink-0">
        {/* Search */}
        <div className="p-2 border-b border-[#141417] relative">
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#050507] text-[11px] text-zinc-300 placeholder-zinc-700 rounded-md border border-zinc-900 focus:border-indigo-500/30 p-1.5 pl-6 focus:outline-none transition-colors"
          />
          <Search className="h-3 w-3 text-zinc-700 absolute left-3.5 top-[15px]" />
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto forge-scroll py-1">
          {filteredFiles.map((file) => (
            <button
              key={file.originalIdx}
              onClick={() => setSelectedFileIdx(file.originalIdx)}
              className={`w-full text-left flex items-center gap-2 px-3 py-1.5 transition-colors ${
                selectedFileIdx === file.originalIdx
                  ? 'bg-white/[0.04] border-l-2 border-l-[#6366f1]'
                  : 'border-l-2 border-l-transparent hover:bg-white/[0.02]'
              }`}
            >
              <FileIcon language={file.language} />
              <span className={`text-[11px] font-mono truncate ${
                selectedFileIdx === file.originalIdx ? 'text-zinc-200' : 'text-zinc-400'
              }`}>
                {getBasename(file.path)}
              </span>
            </button>
          ))}
          {filteredFiles.length === 0 && (
            <span className="text-[10px] text-zinc-700 px-3 py-2 block italic text-center">No matches</span>
          )}
        </div>
      </div>

      {/* Main Code Editor (right) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 h-9 border-b border-[#141417] bg-[#0c0c0f] shrink-0">
          <span className="text-[11px] text-zinc-500 font-mono truncate mr-2" title={activeFile?.path}>
            {activeFile?.path}
          </span>
          <div className="flex items-center gap-2">
            {/* Diff Comparison Button */}
            {originalContents[activeFile?.path] !== editContent && (
              <button
                onClick={() => setDiffMode(!diffMode)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                  diffMode
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300'
                }`}
                title="View original VS edits"
              >
                <RefreshCw className={`h-2.5 w-2.5 ${diffMode ? 'animate-spin' : ''}`} />
                {diffMode ? 'Original' : 'Edits'}
              </button>
            )}

            {/* Read/Write Toggle */}
            <button
              onClick={() => { setEditable(!editable); setDiffMode(false) }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                editable
                  ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              {editable ? <Eye className="h-2.5 w-2.5" /> : <Edit2 className="h-2.5 w-2.5" />}
              {editable ? 'Read-only' : 'Edit'}
            </button>

            {/* Reset to Original */}
            {editable && originalContents[activeFile?.path] !== editContent && (
              <button
                onClick={handleReset}
                className="px-2 py-1 rounded text-[10px] font-medium border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 transition-colors"
              >
                Reset
              </button>
            )}

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="p-1 rounded text-zinc-650 hover:text-zinc-300 hover:bg-white/[0.03] transition-colors"
              title="Copy code"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-auto forge-scroll min-h-0 bg-[#050508]/40">
          <div className="flex min-h-full">
            {/* Line numbers */}
            <div className="shrink-0 w-11 bg-[#09090b]/30 border-r border-[#141417] select-none pt-4 pb-4">
              {lines.map((_, i) => (
                <div key={i} className="text-[11px] font-mono text-zinc-700 text-right pr-3 leading-[1.65]">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code Rendering or Editing */}
            <div className="flex-1 relative min-w-0">
              {editable && !diffMode ? (
                <textarea
                  value={editContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="absolute inset-0 w-full h-full p-4 font-mono text-[11px] leading-[1.65] bg-transparent text-zinc-350 focus:outline-none resize-none overflow-auto forge-scroll"
                  spellCheck={false}
                />
              ) : (
                <pre className="p-4 font-mono text-[11px] leading-[1.65] text-zinc-300 overflow-x-auto">
                  <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
