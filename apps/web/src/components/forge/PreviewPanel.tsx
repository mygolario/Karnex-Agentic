'use client'

import React, { useEffect, useRef, useState } from 'react'

interface PreviewPanelProps {
  files: Array<{ path: string; content: string; language: string }>
  inspectMode: boolean
  onToggleInspect: () => void
  onSelectElement: (selector: string, text: string) => void
  isBuilding: boolean
}

type Viewport = 'desktop' | 'tablet' | 'mobile'

const viewportWidths: Record<Viewport, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

export default function PreviewPanel({
  files,
  inspectMode,
  onToggleInspect,
  onSelectElement,
  isBuilding,
}: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [viewport, setViewport] = useState<Viewport>('desktop')

  const getRenderableCode = () => {
    if (!files || files.length === 0) return ''
    const primaryFile =
      files.find(f => f.path.toLowerCase().endsWith('page.tsx') || f.path.toLowerCase().endsWith('page.html')) ||
      files.find(f => f.path.toLowerCase().endsWith('index.html')) ||
      files[0]
    return primaryFile ? primaryFile.content : ''
  }

  const compileToHTML = (code: string): string => {
    if (!code) return ''

    let bodyContent = code
    if (code.includes('import') || code.includes('export default')) {
      const returnMatch = code.match(/return\s*\(\s*([\s\S]*?)\s*\)/)
      if (returnMatch && returnMatch[1]) {
        bodyContent = returnMatch[1]
      } else {
        bodyContent = code
          .replace(/import[\s\S]*?;/g, '')
          .replace(/export\s+default\s+function[\s\S]*?{/g, '')
          .replace(/return\s+[\s\S]*?/g, '')
          .replace(/^[}{]\s*$/gm, '')
      }
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            background: '#050505',
            foreground: '#e5e5e5',
          },
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            display: ['Outfit', 'sans-serif']
          }
        }
      }
    }
  <\/script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;850&display=swap" rel="stylesheet">
  <style>
    body { background: #050505; color: #e5e5e5; font-family: 'Inter', sans-serif; margin: 0; }
    .inspect-hover { outline: 2px solid rgba(99,102,241,0.5) !important; outline-offset: -1px; cursor: crosshair !important; }
  </style>
</head>
<body class="p-8 min-h-screen">
  <div id="preview-root">${bodyContent}</div>
  <script>
    if (${inspectMode}) {
      document.addEventListener('mouseover', function(e) {
        e.stopPropagation();
        if (e.target && e.target !== document.body && e.target !== document.getElementById('preview-root')) {
          e.target.classList.add('inspect-hover');
        }
      });
      document.addEventListener('mouseout', function(e) {
        e.stopPropagation();
        if (e.target) e.target.classList.remove('inspect-hover');
      });
      document.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.target && e.target !== document.body && e.target !== document.getElementById('preview-root')) {
          var tag = e.target.tagName.toLowerCase();
          var text = e.target.innerText || e.target.value || '';
          var classes = Array.from(e.target.classList).filter(function(c) { return c !== 'inspect-hover'; }).join('.');
          var selector = tag + (classes ? '.' + classes : '');
          window.parent.postMessage({ type: 'FORGE_ELEMENT_CLICK', selector: selector, text: text.substring(0, 50) }, '*');
        }
      });
    }
  <\/script>
</body>
</html>`
  }

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const rawCode = getRenderableCode()
    if (rawCode) {
      iframe.srcdoc = compileToHTML(rawCode)
    }
  }, [files, inspectMode])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'FORGE_ELEMENT_CLICK' && onSelectElement) {
        onSelectElement(event.data.selector, event.data.text)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onSelectElement])

  const hasFiles = files && files.length > 0
  const showEmpty = !hasFiles && !isBuilding
  const showBuilding = isBuilding && !hasFiles

  return (
    <div className="flex flex-col h-full bg-[#0a0a0e] rounded-lg overflow-hidden border border-[#141417]">
      {/* Browser chrome */}
      <div className="flex items-center justify-between px-4 h-9 bg-[#0d0d11] border-b border-[#141417] shrink-0">
        {/* Traffic lights */}
        <div className="flex items-center gap-[6px]">
          <div className="h-[10px] w-[10px] rounded-full forge-dot-red opacity-80" />
          <div className="h-[10px] w-[10px] rounded-full forge-dot-yellow opacity-80" />
          <div className="h-[10px] w-[10px] rounded-full forge-dot-green opacity-80" />
        </div>

        {/* URL bar */}
        <div className="flex-1 mx-4 max-w-md">
          <div className="flex items-center h-[26px] rounded-md bg-[#0a0a0e] border border-[#1a1a1a] px-3">
            <svg className="h-3 w-3 text-zinc-700 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="text-[11px] font-mono text-zinc-600 truncate">preview.karnex.forge/app</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {/* Viewport buttons */}
          {(['desktop', 'tablet', 'mobile'] as Viewport[]).map((vp) => (
            <button
              key={vp}
              onClick={() => setViewport(vp)}
              className={`p-1.5 rounded transition-colors ${
                viewport === vp ? 'text-zinc-300 bg-white/[0.04]' : 'text-zinc-600 hover:text-zinc-400'
              }`}
              title={vp}
            >
              {vp === 'desktop' && (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
                </svg>
              )}
              {vp === 'tablet' && (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25V4.5a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25z" />
                </svg>
              )}
              {vp === 'mobile' && (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
              )}
            </button>
          ))}

          {/* Divider */}
          <div className="h-4 w-px bg-[#1a1a1a] mx-1" />

          {/* Inspect toggle */}
          <button
            onClick={onToggleInspect}
            className={`p-1.5 rounded transition-colors ${
              inspectMode ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-600 hover:text-zinc-400'
            }`}
            title="Inspect element"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 bg-[#050505] flex items-start justify-center overflow-auto min-h-0">
        {showEmpty && (
          <div className="flex flex-col items-center justify-center h-full w-full">
            <div className="border border-dashed border-[#1a1a1a] rounded-lg p-12 flex flex-col items-center gap-3">
              <svg className="h-8 w-8 text-zinc-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 6v12.75c0 1.242 1.008 2.25 2.25 2.25z" />
              </svg>
              <span className="text-[13px] text-zinc-500">Your app will appear here</span>
            </div>
          </div>
        )}

        {showBuilding && (
          <div className="flex flex-col items-center justify-center h-full w-full gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-zinc-800 border-t-indigo-500 animate-spin" />
            <span className="text-[12px] text-zinc-600">Building...</span>
          </div>
        )}

        {hasFiles && (
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{
              width: viewportWidths[viewport],
              maxWidth: '100%',
              margin: viewport !== 'desktop' ? '0 auto' : undefined,
            }}
          >
            <iframe
              ref={iframeRef}
              title="Karnex Forge Preview"
              className="w-full h-full border-0"
              sandbox="allow-scripts"
            />
          </div>
        )}
      </div>
    </div>
  )
}
