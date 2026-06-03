'use client'

import React, { useMemo } from 'react'

interface CodeFile {
  path: string
  content: string
  language: string
  description: string
}

interface CodePanelProps {
  files: CodeFile[]
  selectedFileIdx: number
  onSelectFile: (idx: number) => void
}

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

  // Comments — // and /* */
  escaped = escaped.replace(/(\/\/.*$)/gm, '<span class="syn-cmt">$1</span>')
  escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="syn-cmt">$1</span>')

  // Strings — double and single quotes and template literals
  escaped = escaped.replace(/(&quot;.*?&quot;|'[^']*?'|`[^`]*?`)/g, '<span class="syn-str">$1</span>')

  // Numbers
  escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="syn-num">$1</span>')

  // JSX/HTML tags
  escaped = escaped.replace(/(&lt;\/?[a-zA-Z][a-zA-Z0-9]*)/g, '<span class="syn-tag">$1</span>')
  escaped = escaped.replace(/(\/&gt;|&gt;)/g, '<span class="syn-tag">$1</span>')

  // Keywords
  const keywords = ['import', 'export', 'default', 'from', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'interface', 'type', 'extends', 'implements', 'async', 'await', 'new', 'throw', 'try', 'catch', 'finally', 'switch', 'case', 'break', 'continue', 'typeof', 'instanceof', 'void', 'null', 'undefined', 'true', 'false', 'as', 'in', 'of']

  if (language === 'sql') {
    keywords.push('SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'ON', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'AND', 'OR', 'NOT', 'NULL', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'DEFAULT', 'CASCADE', 'TEXT', 'INTEGER', 'BOOLEAN', 'TIMESTAMP', 'UUID', 'SERIAL', 'BIGINT', 'VARCHAR', 'IF', 'EXISTS', 'ENABLE', 'ROW', 'LEVEL', 'SECURITY', 'POLICY', 'USING', 'WITH', 'CHECK', 'GRANT', 'ALL', 'PRIVILEGES', 'TO')
  }

  const kwPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g')
  escaped = escaped.replace(kwPattern, (match) => {
    // Don't re-wrap if already inside a span
    return `<span class="syn-kw">${match}</span>`
  })

  return escaped
}

export default function CodePanel({ files, selectedFileIdx, onSelectFile }: CodePanelProps) {
  const activeFile = files[selectedFileIdx]

  const lines = useMemo(() => {
    if (!activeFile) return []
    return activeFile.content.split('\n')
  }, [activeFile])

  const highlightedCode = useMemo(() => {
    if (!activeFile) return ''
    return highlightCode(activeFile.content, activeFile.language)
  }, [activeFile])

  const handleCopy = () => {
    if (activeFile) {
      navigator.clipboard.writeText(activeFile.content)
    }
  }

  if (!files || files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0a0e] rounded-lg border border-[#141417]">
        <span className="text-[13px] text-zinc-600">No files generated yet</span>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-[#0a0a0e] rounded-lg overflow-hidden border border-[#141417]">
      {/* File tree sidebar */}
      <div className="w-[200px] bg-[#09090b] border-r border-[#141417] flex flex-col shrink-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#141417]">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">Files</span>
          <span className="text-[10px] text-zinc-700 font-mono">{files.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto forge-scroll py-1">
          {files.map((file, idx) => (
            <button
              key={idx}
              onClick={() => onSelectFile(idx)}
              className={`w-full text-left flex items-center gap-2 px-3 py-1.5 transition-colors ${
                selectedFileIdx === idx
                  ? 'bg-white/[0.04] border-l-2 border-l-[#6366f1]'
                  : 'border-l-2 border-l-transparent hover:bg-white/[0.02]'
              }`}
            >
              <FileIcon language={file.language} />
              <span className={`text-[11px] font-mono truncate ${
                selectedFileIdx === idx ? 'text-zinc-200' : 'text-zinc-400'
              }`}>
                {getBasename(file.path)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Code viewer */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* File bar */}
        <div className="flex items-center justify-between px-4 h-8 border-b border-[#141417] shrink-0">
          <span className="text-[11px] text-zinc-600 font-mono truncate">{activeFile?.path}</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-medium text-zinc-600 bg-zinc-900/80 border border-zinc-800/50 rounded px-1.5 py-0.5">
              {activeFile?.language}
            </span>
            <button
              onClick={handleCopy}
              className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.03] transition-colors"
              title="Copy code"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
            </button>
          </div>
        </div>

        {/* Code content */}
        <div className="flex-1 overflow-auto forge-scroll min-h-0">
          <div className="flex">
            {/* Line numbers */}
            <div className="shrink-0 w-[44px] bg-[#09090b]/50 border-r border-[#141417] select-none pt-4 pb-4">
              {lines.map((_, i) => (
                <div key={i} className="text-[11px] font-mono text-zinc-700 text-right pr-3 leading-[1.65]">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code */}
            <pre className="flex-1 text-[11px] font-mono text-zinc-300 leading-[1.65] p-4 overflow-x-auto">
              <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
