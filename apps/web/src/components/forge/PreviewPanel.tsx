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

/* ── HTML / React Compiler Helpers ── */

const extractClassName = (attrs: string): string => {
  const match = attrs.match(/className=["']([^"']+)["']/);
  return match ? match[1] : '';
};

const cleanAttrs = (attrs: string): string => {
  return attrs
    .replace(/className=["']([^"']+)["']/g, '')
    .replace(/onClick=\{[^}]+\}/g, '')
    .replace(/onChange=\{[^}]+\}/g, '')
    .replace(/onSubmit=\{[^}]+\}/g, '');
};

const uiComponentsMap: Record<string, (attrs: string, children: string) => string> = {
  Card: (attrs, children) => `<div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 ${extractClassName(attrs)}">${children}</div>`,
  CardHeader: (attrs, children) => `<div class="mb-4 ${extractClassName(attrs)}">${children}</div>`,
  CardTitle: (attrs, children) => `<h3 class="text-xl font-bold tracking-tight text-white ${extractClassName(attrs)}">${children}</h3>`,
  CardDescription: (attrs, children) => `<p class="text-sm text-zinc-400 mt-1 ${extractClassName(attrs)}">${children}</p>`,
  CardContent: (attrs, children) => `<div class="space-y-4 ${extractClassName(attrs)}">${children}</div>`,
  CardFooter: (attrs, children) => `<div class="flex items-center pt-4 border-t border-zinc-800 mt-4 ${extractClassName(attrs)}">${children}</div>`,
  Button: (attrs, children) => `<button class="inline-flex items-center justify-center rounded-lg text-xs font-semibold px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${extractClassName(attrs)}">${children}</button>`,
  Input: (attrs, children) => `<input class="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 ${extractClassName(attrs)}" ${cleanAttrs(attrs)} />`,
  Textarea: (attrs, children) => `<textarea class="flex min-h-[60px] w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 ${extractClassName(attrs)}" ${cleanAttrs(attrs)}>${children}</textarea>`,
  CheckIcon: (attrs) => `<svg class="h-4 w-4 text-indigo-400 inline shrink-0 ${extractClassName(attrs)}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`,
  XIcon: (attrs) => `<svg class="h-4 w-4 text-zinc-500 inline shrink-0 ${extractClassName(attrs)}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`,
  XMarkIcon: (attrs) => `<svg class="h-4 w-4 text-zinc-500 inline shrink-0 ${extractClassName(attrs)}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`,
};

const parseArrayLiteral = (fileContent: string, arrayName: string): any[] | null => {
  const regex = new RegExp(`const\\s+${arrayName}\\s*(?::\\s*[^=]+)?=\\s*(\\[[\\s\\S]*?\\])\\s*(?:;|\\n)`);
  const match = fileContent.match(regex);
  if (!match) return null;
  const arrayStr = match[1].replace(/as\s+[a-zA-Z0-9_\[\]<>|\s]+/g, '');
  try {
    const evalFn = new Function(`return ${arrayStr}`);
    return evalFn();
  } catch (e) {
    console.warn("Failed to parse array literal:", arrayName, e);
    return null;
  }
};

const findFileByImport = (importedSymbol: string, importPath: string, files: Array<{ path: string; content: string }>) => {
  const cleanPath = importPath.replace(/^@\//, '').replace(/^\.+\//, '').toLowerCase();
  const pathParts = cleanPath.split('/');
  const lastPart = pathParts[pathParts.length - 1];

  // 1. Direct path match
  let matched = files.find(f => f.path.toLowerCase().includes(cleanPath));
  if (matched) return matched;

  // 2. Match last part of path
  matched = files.find(f => {
    const filename = f.path.split('/').pop()?.toLowerCase() || '';
    return filename.includes(lastPart);
  });
  if (matched) return matched;

  // 3. Match symbol name in file contents
  matched = files.find(f => {
    const content = f.content;
    return content.includes(`export function ${importedSymbol}`) ||
           content.includes(`export const ${importedSymbol}`) ||
           content.includes(`export default function ${importedSymbol}`) ||
           content.includes(`export default ${importedSymbol}`);
  });
  return matched;
};

const extractReturnBlock = (code: string): string => {
  if (!code) return '';
  const mainFuncMatch = code.match(/(?:export\s+default\s+function|export\s+function|export\s+const\s+[A-Z]\w+)/);
  let searchArea = code;
  if (mainFuncMatch && mainFuncMatch.index !== undefined) {
    searchArea = code.slice(mainFuncMatch.index);
  }
  const returnMatch = searchArea.match(/return\s*\(\s*([\s\S]*?)\s*\)/);
  if (returnMatch && returnMatch[1]) {
    return returnMatch[1];
  }
  const singleLineMatch = searchArea.match(/return\s+(<[\s\S]*?>);/);
  if (singleLineMatch && singleLineMatch[1]) {
    return singleLineMatch[1];
  }
  return '';
};

const extractLocalComponentReturn = (fileContent: string, componentName: string): string => {
  const index = fileContent.indexOf(`function ${componentName}`);
  if (index === -1) return '';
  const searchArea = fileContent.slice(index);
  const returnMatch = searchArea.match(/return\s*\(\s*([\s\S]*?)\s*\)/);
  return returnMatch ? returnMatch[1] : '';
};

const resolveJSX = (
  jsx: string,
  currentFile: { path: string; content: string } | null,
  files: Array<{ path: string; content: string }>,
  depth = 0
): string => {
  if (depth > 6) return '';
  if (!jsx) return '';

  // Parse imports map
  const importsMap: Record<string, string> = {};
  if (currentFile) {
    const importRegex = /import\s+([\w+\s*,{}]+)\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(currentFile.content)) !== null) {
      const importSource = match[2];
      const importSpecifier = match[1].trim();
      if (importSpecifier.startsWith('{')) {
        const names = importSpecifier.replace(/[{}]/g, '').split(',');
        names.forEach(n => {
          const name = n.trim().split(' as ')[0].trim();
          if (name) importsMap[name] = importSource;
        });
      } else {
        const name = importSpecifier.replace(/\*\s+as\s+/, '').split(',')[0].trim();
        if (name) importsMap[name] = importSource;
      }
    }
  }

  // Handle map loops
  let resolved = jsx;
  const mapRegex = /\{\s*([a-zA-Z0-9_]+)\.map\(\s*\(\s*([a-zA-Z0-9_]+)\s*(?:,\s*([a-zA-Z0-9_]+)\s*)?\)\s*=>\s*(?:\(\s*([\s\S]*?)\s*\)|([\s\S]*?))\s*\)\s*\}/g;
  resolved = resolved.replace(mapRegex, (fullMatch: string, arrayName: string, itemName: string, indexName: string | undefined, template1: string | undefined, template2: string | undefined) => {
    const templateJSX = template1 || template2 || '';
    const array = parseArrayLiteral(currentFile?.content || '', arrayName);
    
    if (!array || array.length === 0) {
      return resolveJSX(templateJSX, currentFile, files, depth + 1);
    }
    
    let result = '';
    array.forEach((item: any, index: number) => {
      let instance = templateJSX;
      const fieldRegex = new RegExp(`\\{\\s*${itemName}\\.([a-zA-Z0-9_]+)\\s*\\}`, 'g');
      instance = instance.replace(fieldRegex, (m: string, fieldName: string) => {
        return item[fieldName] !== undefined ? item[fieldName] : '';
      });

      if (indexName) {
        const idxRegex = new RegExp(`\\{\\s*${indexName}\\s*\\}`, 'g');
        instance = instance.replace(idxRegex, String(index));
      }

      const ternaryRegex = new RegExp(`\\{\\s*${itemName}\\.([a-zA-Z0-9_]+)\\s*\\?\\s*['"]([^'"]*)['"]\\s*:\\s*['"]([^'"]*)['"]\\s*\\}`, 'g');
      instance = instance.replace(ternaryRegex, (m: string, fieldName: string, val1: string, val2: string) => {
        return item[fieldName] ? val1 : val2;
      });

      const conditionalRegex = new RegExp(`\\{\\s*${itemName}\\.([a-zA-Z0-9_]+)\\s*\\?\\s*([\\s\\S]*?)\\s*:\\s*(?:null|undefined)\\s*\\}`, 'g');
      instance = instance.replace(conditionalRegex, (m: string, fieldName: string, trueBlock: string) => {
        return item[fieldName] ? trueBlock : '';
      });

      result += resolveJSX(instance, currentFile, files, depth + 1);
    });
    return result;
  });

  // Resolve JSX components and HTML tags
  const tagRegex = /<([a-zA-Z0-9]+)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g;
  resolved = resolved.replace(tagRegex, (fullMatch: string, TagName: string, attributes: string, children: string | undefined) => {
    const isStandardHtml = TagName[0] === TagName[0].toLowerCase();

    if (isStandardHtml) {
      const resolvedChildren = children ? resolveJSX(children, currentFile, files, depth + 1) : '';
      const closedTag = fullMatch.endsWith('/>') ? ' />' : `>${resolvedChildren}</${TagName}>`;
      const cleanedAttrs = attributes
        .replace(/className=/g, 'class=')
        .replace(/onClick=\{[^}]+\}/g, '')
        .replace(/onChange=\{[^}]+\}/g, '')
        .replace(/onSubmit=\{[^}]+\}/g, '');
      return `<${TagName}${cleanedAttrs}${closedTag}`;
    }

    const resolvedChildren = children ? resolveJSX(children, currentFile, files, depth + 1) : '';

    if (uiComponentsMap[TagName]) {
      return uiComponentsMap[TagName](attributes, resolvedChildren);
    }

    if (importsMap[TagName]) {
      const matchedFile = findFileByImport(TagName, importsMap[TagName], files);
      if (matchedFile) {
        let returnBlock = extractReturnBlock(matchedFile.content);
        if (resolvedChildren) {
          returnBlock = returnBlock.replace(/\{\s*children\s*\}/g, resolvedChildren);
        } else {
          returnBlock = returnBlock.replace(/\{\s*children\s*\}/g, '');
        }
        return resolveJSX(returnBlock, matchedFile, files, depth + 1);
      }
    }

    if (currentFile && currentFile.content.includes(`function ${TagName}`)) {
      let returnBlock = extractLocalComponentReturn(currentFile.content, TagName);
      if (resolvedChildren) {
        returnBlock = returnBlock.replace(/\{\s*children\s*\}/g, resolvedChildren);
      } else {
        returnBlock = returnBlock.replace(/\{\s*children\s*\}/g, '');
      }
      return resolveJSX(returnBlock, currentFile, files, depth + 1);
    }

    return resolvedChildren || `<div class="p-4 border border-zinc-800 text-zinc-500 rounded text-center text-xs font-mono">&lt;${TagName} /&gt;</div>`;
  });

  // Clean up remaining React/JS curly brace expressions
  resolved = resolved.replace(/\{\s*[^?}]+\?\s*['"]([^'"]*)['"]\s*:\s*['"]([^'"]*)['"]\s*\}/g, '$2');
  resolved = resolved.replace(/\{\s*[^}&&]+&&\s*([\s\S]*?)\s*\}/g, '');
  resolved = resolved.replace(/\{\s*[a-zA-Z0-9_.]+(?:\?\.[a-zA-Z0-9_.]+)*\s*\}/g, '');
  resolved = resolved.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  return resolved;
};

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

    const primaryFile =
      files.find(f => f.path.toLowerCase().endsWith('page.tsx') || f.path.toLowerCase().endsWith('page.html')) ||
      files.find(f => f.path.toLowerCase().endsWith('index.html')) ||
      files[0];

    const resolvedBody = resolveJSX(extractReturnBlock(code), primaryFile || null, files);

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
  <div id="preview-root">${resolvedBody}</div>
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
            className="w-full h-full transition-all duration-300 ease-out"
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
