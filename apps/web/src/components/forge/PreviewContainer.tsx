'use client'

import React, { useEffect, useRef, useState } from 'react'

interface PreviewContainerProps {
  files: Array<{ path: string; content: string; language: string }>
  activeFilePath?: string
  inspectMode?: boolean
  onSelectElement?: (selector: string, text: string) => void
}

export default function PreviewContainer({
  files,
  activeFilePath,
  inspectMode = false,
  onSelectElement
}: PreviewContainerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [viewportWidth, setViewportWidth] = useState<'100%' | '768px' | '375px'>('100%')

  // Find the primary page to render (defaults to page.tsx, index.html, page.html, or first file)
  const getRenderableCode = () => {
    if (!files || files.length === 0) return ''
    
    // Try to find index.html, page.tsx, main component
    const primaryFile = 
      files.find(f => f.path.toLowerCase().endsWith('page.tsx') || f.path.toLowerCase().endsWith('page.html')) ||
      files.find(f => f.path.toLowerCase().endsWith('index.html')) ||
      files[0]
      
    return primaryFile ? primaryFile.content : ''
  }

  // Pre-process code (convert JSX to browser-executable HTML + tailwind script if page.tsx)
  const compileToHTML = (code: string) => {
    if (!code) return `
      <div style="background:#09090b;color:#a1a1aa;height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;font-size:13px;">
        Define components parameters to scaffold visual preview.
      </div>
    `

    // Clean react code for preview
    let bodyContent = code
    if (code.includes('import') || code.includes('export default')) {
      // It's a React file, let's strip imports/exports and return statements for iframe rendering
      const returnMatch = code.match(/return\s*\(\s*([\s\S]*?)\s*\)/)
      if (returnMatch && returnMatch[1]) {
        bodyContent = returnMatch[1]
      } else {
        // Strip exports/imports and standard React function wrapper boilerplate
        bodyContent = code
          .replace(/import[\s\S]*?;/g, '')
          .replace(/export\s+default\s+function[\s\S]*?{/g, '')
          .replace(/return\s+[\s\S]*?/g, '')
          .replace(/^[}{]\s*$/gm, '')
      }
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  background: '#050505',
                  foreground: '#e5e5e5',
                  indigo: {
                    500: '#6366f1',
                    600: '#4f46e5'
                  }
                },
                fontFamily: {
                  sans: ['Inter', 'sans-serif'],
                  display: ['Outfit', 'sans-serif']
                }
              }
            }
          }
        </script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;850&display=swap" rel="stylesheet">
        <style>
          body {
            background-color: #050505;
            color: #e5e5e5;
            font-family: 'Inter', sans-serif;
          }
          /* Hover outline in inspector mode */
          .inspect-hover {
            outline: 2px dashed rgba(99, 102, 241, 0.6) !important;
            outline-offset: -2px;
            cursor: pointer !important;
          }
        </style>
      </head>
      <body class="p-8 min-h-screen">
        <div id="preview-root">${bodyContent}</div>

        <script>
          // Inspector listener inside iframe
          if (${inspectMode}) {
            document.addEventListener('mouseover', (e) => {
              e.stopPropagation();
              if (e.target && e.target !== document.body && e.target !== document.getElementById('preview-root')) {
                e.target.classList.add('inspect-hover');
              }
            });

            document.addEventListener('mouseout', (e) => {
              e.stopPropagation();
              if (e.target) {
                e.target.classList.remove('inspect-hover');
              }
            });

            document.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.target && e.target !== document.body && e.target !== document.getElementById('preview-root')) {
                const tag = e.target.tagName.toLowerCase();
                const text = e.target.innerText || e.target.value || '';
                const classes = Array.from(e.target.classList).filter(c => c !== 'inspect-hover').join('.');
                const selector = tag + (classes ? '.' + classes : '');
                
                window.parent.postMessage({
                  type: 'FORGE_ELEMENT_CLICK',
                  selector,
                  text: text.substring(0, 50)
                }, '*');
              }
            });
          }
        </script>
      </body>
      </html>
    `
  }

  // Update Iframe srcDoc on code change or inspectMode toggle
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const rawCode = getRenderableCode()
    iframe.srcdoc = compileToHTML(rawCode)
  }, [files, inspectMode])

  // Listen to post-messages from Iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'FORGE_ELEMENT_CLICK' && onSelectElement) {
        onSelectElement(event.data.selector, event.data.text)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onSelectElement])

  return (
    <div className="flex flex-col h-full bg-[#050505] rounded-2xl border border-[#1a1a1a] overflow-hidden">
      {/* Top Controller Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#1a1a1a]/85 bg-zinc-950/20">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#6366f1]" />
          <span className="text-xs font-semibold text-zinc-300 font-mono">Sandbox View</span>
          {inspectMode && (
            <span className="rounded bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 text-[9px] font-bold text-indigo-400 font-mono animate-pulse">
              INSPECTOR ACTIVE
            </span>
          )}
        </div>

        {/* Viewport controls */}
        <div className="flex items-center gap-1 bg-[#09090b] rounded-lg border border-zinc-900 p-0.5">
          <button
            onClick={() => setViewportWidth('100%')}
            className={`px-3 py-1 text-[10px] font-bold rounded font-mono transition-all ${
              viewportWidth === '100%' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/10' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Desktop
          </button>
          <button
            onClick={() => setViewportWidth('768px')}
            className={`px-3 py-1 text-[10px] font-bold rounded font-mono transition-all ${
              viewportWidth === '768px' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/10' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Tablet
          </button>
          <button
            onClick={() => setViewportWidth('375px')}
            className={`px-3 py-1 text-[10px] font-bold rounded font-mono transition-all ${
              viewportWidth === '375px' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/10' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Mobile
          </button>
        </div>
      </div>

      {/* Embedded browser window */}
      <div className="flex-1 bg-[#030303] flex items-center justify-center p-6 overflow-y-auto">
        <div
          style={{ width: viewportWidth }}
          className="h-full bg-[#050505] rounded-xl border border-zinc-900 shadow-2xl overflow-hidden transition-all duration-300 relative"
        >
          <iframe
            ref={iframeRef}
            title="Karnex Forge Sandbox Preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts"
          />
        </div>
      </div>
    </div>
  )
}
