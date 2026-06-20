'use client'

import React, { useEffect, useRef, useState } from 'react'

interface PreviewPanelProps {
  files: Array<{ path: string; content: string; language: string }>
  inspectMode: boolean
  onToggleInspect: () => void
  onSelectElement: (selector: string, text: string) => void
  isBuilding: boolean
  gitHubPrUrl?: string
}

type Viewport = 'desktop' | 'tablet' | 'mobile'

const viewportWidths: Record<Viewport, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

/* ── HTML / React Compiler Helpers ── */

export default function PreviewPanel({
  files,
  inspectMode,
  onToggleInspect,
  onSelectElement,
  isBuilding,
  gitHubPrUrl,
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
    // Escaped JSON serializer to inject files safely in the script tag without parsing errors
    const escapedFilesJson = JSON.stringify(files)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e');

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

  <!-- Load React/ReactDOM 18 UMD from CDN, Babel Standalone, and Lucide Icons UMD -->
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js" crossorigin></script>
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
</head>
<body class="p-8 min-h-screen">
  <div id="preview-root">
    <div class="flex flex-col items-center justify-center min-h-[200px] gap-2">
      <div class="h-6 w-6 rounded-full border-2 border-zinc-850 border-t-indigo-500 animate-spin"><\/div>
      <span class="text-xs text-zinc-500">Initializing preview environment...<\/span>
    </div>
  </div>

  <script>
    (function() {
      // 1. Files module registry
      window.__files = ${escapedFilesJson};

      // 2. Setup Mock Supabase Client backed by localStorage
      function createMockSupabase() {
        const getLocalStorageData = (table) => {
          try {
            const data = localStorage.getItem('supabase_mock_' + table);
            return data ? JSON.parse(data) : [];
          } catch (e) {
            return [];
          }
        };

        const setLocalStorageData = (table, data) => {
          try {
            localStorage.setItem('supabase_mock_' + table, JSON.stringify(data));
          } catch (e) {}
        };

        const builder = (table, queryState = {}) => {
          return {
            select: function(columns = '*') {
              if (queryState.action !== 'insert' && queryState.action !== 'update' && queryState.action !== 'delete') {
                queryState.action = 'select';
              }
              return this;
            },
            insert: function(values) {
              queryState.action = 'insert';
              queryState.values = values;
              return this;
            },
            update: function(values) {
              queryState.action = 'update';
              queryState.values = values;
              return this;
            },
            delete: function() {
              queryState.action = 'delete';
              return this;
            },
            eq: function(column, value) {
              queryState.filters = queryState.filters || [];
              queryState.filters.push({ column, operator: 'eq', value });
              return this;
            },
            match: function(queryMap) {
              queryState.filters = queryState.filters || [];
              Object.entries(queryMap).forEach(([column, value]) => {
                queryState.filters.push({ column, operator: 'eq', value });
              });
              return this;
            },
            order: function(column, { ascending = true } = {}) {
              queryState.order = { column, ascending };
              return this;
            },
            limit: function(count) {
              queryState.limit = count;
              return this;
            },
            single: function() {
              queryState.single = true;
              return this;
            },
            then: function(onfulfilled, onrejected) {
              let data = getLocalStorageData(table);
              let error = null;

              try {
                if (queryState.action === 'select') {
                  if (queryState.filters) {
                    for (const filter of queryState.filters) {
                      if (filter.operator === 'eq') {
                        data = data.filter(row => row[filter.column] == filter.value);
                      }
                    }
                  }
                  if (queryState.order) {
                    const { column, ascending } = queryState.order;
                    data.sort((a, b) => {
                      if (a[column] < b[column]) return ascending ? -1 : 1;
                      if (a[column] > b[column]) return ascending ? 1 : -1;
                      return 0;
                    });
                  }
                  if (queryState.limit !== undefined) {
                    data = data.slice(0, queryState.limit);
                  }
                } else if (queryState.action === 'insert') {
                  const rowsToInsert = Array.isArray(queryState.values) ? queryState.values : [queryState.values];
                  const newRows = rowsToInsert.map(row => ({
                    id: Math.random().toString(36).substring(2, 11),
                    created_at: new Date().toISOString(),
                    ...row
                  }));
                  data = [...data, ...newRows];
                  setLocalStorageData(table, data);
                  data = newRows;
                } else if (queryState.action === 'update') {
                  data = data.map(row => {
                    let match = true;
                    if (queryState.filters) {
                      for (const filter of queryState.filters) {
                        if (filter.operator === 'eq' && row[filter.column] != filter.value) {
                          match = false;
                        }
                      }
                    }
                    if (match) {
                      return { ...row, ...queryState.values };
                    }
                    return row;
                  });
                  setLocalStorageData(table, data);
                } else if (queryState.action === 'delete') {
                  data = data.filter(row => {
                    let match = true;
                    if (queryState.filters) {
                      for (const filter of queryState.filters) {
                        if (filter.operator === 'eq' && row[filter.column] != filter.value) {
                          match = false;
                        }
                      }
                    }
                    return !match;
                  });
                  setLocalStorageData(table, data);
                }

                if (queryState.single && Array.isArray(data)) {
                  data = data[0] || null;
                }
              } catch (e) {
                error = e;
              }

              const result = { data, error };
              return Promise.resolve(result).then(onfulfilled, onrejected);
            }
          };
        };

        return {
          from: (table) => builder(table),
          auth: {
            signUp: ({ email, password }) => {
              return Promise.resolve({ data: { user: { email, id: 'mock-uid' } }, error: null });
            },
            signInWithPassword: ({ email, password }) => {
              return Promise.resolve({ data: { user: { email, id: 'mock-uid' } }, error: null });
            },
            signOut: () => Promise.resolve({ error: null }),
            getUser: () => Promise.resolve({ data: { user: { email: 'mock@example.com', id: 'mock-uid' } }, error: null }),
            onAuthStateChange: (callback) => {
              callback('SIGNED_IN', { email: 'mock@example.com', id: 'mock-uid' });
              return { data: { subscription: { unsubscribe: () => {} } } };
            }
          }
        };
      }
      window.createMockSupabase = createMockSupabase;

      // 3. Setup dynamic loader for lucide-react (mapping components to native SVGs)
      const LucideReactMock = new Proxy({}, {
        get(target, name) {
          if (name === '__esModule') return true;
          return React.forwardRef((props, ref) => {
            const { size = 24, stroke = 'currentColor', color, strokeWidth = 2, fill = 'none', className, children, ...rest } = props;
            const finalStroke = color || stroke;

            const getIconData = (iconName) => {
              if (!window.lucide) return null;
              if (window.lucide[iconName]) return window.lucide[iconName];

              const camelName = iconName.charAt(0).toUpperCase() + iconName.slice(1);
              if (window.lucide[camelName]) return window.lucide[camelName];

              const lowerName = iconName.toLowerCase();
              if (window.lucide[lowerName]) return window.lucide[lowerName];

              const kebabName = iconName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
              if (window.lucide[kebabName]) return window.lucide[kebabName];

              if (window.lucide.icons) {
                if (window.lucide.icons[iconName]) return window.lucide.icons[iconName];
                if (window.lucide.icons[camelName]) return window.lucide.icons[camelName];
                if (window.lucide.icons[lowerName]) return window.lucide.icons[lowerName];
                if (window.lucide.icons[kebabName]) return window.lucide.icons[kebabName];
              }
              return null;
            };

            const iconData = getIconData(name);
            if (!iconData) {
              return React.createElement(
                'svg',
                {
                  ref,
                  width: size,
                  height: size,
                  viewBox: '0 0 24 24',
                  fill: fill,
                  stroke: finalStroke,
                  strokeWidth: strokeWidth,
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                  className: 'lucide lucide-fallback ' + (className || ''),
                  ...rest
                },
                React.createElement('circle', { cx: '12', cy: '12', r: '10' }),
                React.createElement('line', { x1: '12', y1: '8', x2: '12', y2: '12' }),
                React.createElement('line', { x1: '12', y1: '16', x2: '12.01', y2: '16' })
              );
            }

            const reactChildren = iconData.map((node, index) => {
              const [tagName, attributes] = node;
              const cleanAttrs = { ...attributes };
              if (cleanAttrs.class) {
                cleanAttrs.className = cleanAttrs.class;
                delete cleanAttrs.class;
              }
              return React.createElement(tagName, { ...cleanAttrs, key: index });
            });

            return React.createElement(
              'svg',
              {
                ref,
                width: size,
                height: size,
                viewBox: '0 0 24 24',
                fill: fill,
                stroke: finalStroke,
                strokeWidth: strokeWidth,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                className: 'lucide lucide-' + name.toLowerCase() + ' ' + (className || ''),
                ...rest
              },
              ...reactChildren,
              ...(children ? (Array.isArray(children) ? children : [children]) : [])
            );
          });
        }
      });
      window.LucideReactMock = LucideReactMock;

      // 4. Setup mock for framer-motion to avoid heavy UMD bundle dependency
      const motionMock = new Proxy({}, {
        get(target, prop) {
          return React.forwardRef((props, ref) => {
            const { animate, initial, exit, transition, variants, ...rest } = props;
            return React.createElement(prop, { ...rest, ref });
          });
        }
      });

      // 5. Client-side Module Registry and Path Resolver
      function resolvePath(currentPath, importPath) {
        if (!importPath.startsWith('.') && !importPath.startsWith('/') && !importPath.startsWith('@/')) {
          return importPath;
        }
        if (importPath.startsWith('@/')) {
          return importPath.slice(2);
        }
        const parts = currentPath.split('/');
        parts.pop(); // remove file name
        
        const importParts = importPath.split('/');
        for (const part of importParts) {
          if (part === '.') {
            continue;
          } else if (part === '..') {
            parts.pop();
          } else {
            parts.push(part);
          }
        }
        return parts.join('/');
      }

      function findFile(resolvedPath) {
        const cleanPath = resolvedPath.replace(/^\\/+/, '');
        const extensions = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];
        for (const ext of extensions) {
          const target = (cleanPath + ext).toLowerCase();
          let found = window.__files.find(f => {
            const p = f.path.replace(/^\\/+/, '').toLowerCase();
            if (p === target) return true;
            const pNoSrc = p.replace(/^src\\//, '');
            const targetNoSrc = target.replace(/^src\\//, '');
            if (pNoSrc === targetNoSrc) return true;
            if (p.endsWith(targetNoSrc)) return true;
            return false;
          });
          if (found) return found;
        }
        return null;
      }

      const moduleCache = {};

      function requireModule(importPath, currentPath) {
        if (importPath === 'react') {
          return window.React;
        }
        if (importPath === 'react-dom') {
          return window.ReactDOM;
        }
        if (importPath === 'react-dom/client') {
          return {
            createRoot: window.ReactDOM.createRoot,
            hydrateRoot: window.ReactDOM.hydrateRoot
          };
        }
        if (importPath === 'lucide-react') {
          return window.LucideReactMock;
        }
        if (importPath === '@supabase/supabase-js') {
          return {
            createClient: (url, key) => window.createMockSupabase()
          };
        }
        if (importPath === 'framer-motion') {
          return {
            motion: motionMock,
            AnimatePresence: ({ children }) => children,
            LayoutGroup: ({ children }) => children
          };
        }
        if (importPath === 'canvas-confetti') {
          return () => console.log('Confetti burst!');
        }
        if (importPath === 'next/image' || importPath === 'next/legacy/image') {
          return {
            default: function MockImage({ src, alt, className, style, ...rest }) {
              return React.createElement('img', {
                src,
                alt,
                className,
                style: { objectFit: 'cover', ...style },
                ...rest
              });
            }
          };
        }
        if (importPath === 'next/link') {
          return {
            default: function MockLink({ href, children, className, ...rest }) {
              return React.createElement('a', {
                href,
                className,
                onClick: (e) => {
                  e.preventDefault();
                  console.log('Navigating to:', href);
                },
                ...rest
              }, children);
            }
          };
        }
        if (importPath === 'next/navigation') {
          return {
            useRouter: () => ({
              push: (url) => console.log('Router.push:', url),
              replace: (url) => console.log('Router.replace:', url),
              prefetch: () => {},
              back: () => console.log('Router.back'),
              forward: () => console.log('Router.forward'),
              refresh: () => {}
            }),
            usePathname: () => '/',
            useSearchParams: () => new URLSearchParams(),
            useParams: () => ({})
          };
        }
        if (importPath.startsWith('next/font/')) {
          const dummyFont = () => ({ className: '' });
          return new Proxy(dummyFont, {
            get(target, prop) {
              return dummyFont;
            }
          });
        }

        const resolved = resolvePath(currentPath, importPath);

        if (importPath.endsWith('.css')) {
          const cssFile = findFile(resolved);
          if (cssFile) {
            const style = document.createElement('style');
            style.innerHTML = cssFile.content;
            document.head.appendChild(style);
          }
          return {};
        }

        if (moduleCache[resolved]) {
          return moduleCache[resolved].exports;
        }

        const file = findFile(resolved);
        if (!file) {
          console.warn('Module not found:', importPath, 'resolved as:', resolved);
          return new Proxy({}, {
            get(target, prop) {
              if (prop === '$$typeof') return undefined;
              if (prop === 'default') {
                return function DummyDefaultComponent(props) {
                  return React.createElement('div', { style: { border: '1px dashed #ef4444', padding: '8px', color: '#ef4444', margin: '4px', fontSize: '12px' } }, importPath + ' default export not found');
                };
              }
              if (typeof prop === 'string' && prop[0] === prop[0].toUpperCase()) {
                return function DummyComponent(props) {
                  return React.createElement('div', { style: { border: '1px dashed #ef4444', padding: '8px', color: '#ef4444', margin: '4px', fontSize: '12px' } }, prop + ' not found in ' + importPath);
                };
              }
              const dummyFunc = () => new Proxy({ className: '' }, {
                get(t, p) {
                  if (p === 'className') return '';
                  return dummyFunc;
                }
              });
              return dummyFunc;
            }
          });
        }

        // Setup jsx/runtime fallback in case Babel transforms JSX to use automatic imports
        if (importPath === 'react/jsx-runtime' || importPath === 'react/jsx-dev-runtime') {
          return {
            jsx: (type, props, key) => window.React.createElement(type, { ...props, key }),
            jsxs: (type, props, key) => window.React.createElement(type, { ...props, key }),
            jsxDEV: (type, props, key) => window.React.createElement(type, { ...props, key }),
          };
        }

        let compiled;
        try {
          compiled = Babel.transform(file.content, {
            presets: [
              ['env', { modules: 'commonjs' }],
              ['react', { runtime: 'classic' }],
              'typescript'
            ],
            filename: file.path
          }).code;
        } catch (err) {
          console.error('Babel compilation error in ' + file.path + ':', err);
          throw err;
        }

        const module = { exports: {} };
        const exports = module.exports;
        const localRequire = (p) => requireModule(p, file.path);

        try {
          const run = new Function(
            'require',
            'module',
            'exports',
            'React',
            'useState',
            'useEffect',
            'useRef',
            'useMemo',
            'useCallback',
            compiled
          );
          run(
            localRequire,
            module,
            exports,
            window.React,
            window.React.useState,
            window.React.useEffect,
            window.React.useRef,
            window.React.useMemo,
            window.React.useCallback
          );
        } catch (err) {
          console.error('Runtime error in module ' + file.path + ':', err);
          throw err;
        }

        moduleCache[resolved] = module;
        return module.exports;
      }

      // 6. Mount primary component to #preview-root when environment is fully loaded
      function startRunner() {
        if (!window.React || !window.ReactDOM || !window.Babel || !window.lucide) {
          setTimeout(startRunner, 50);
          return;
        }

        const primaryFile = window.__files.find(f => 
          f.path.toLowerCase().endsWith('page.tsx') || 
          f.path.toLowerCase().endsWith('page.jsx') || 
          f.path.toLowerCase().endsWith('page.js') || 
          f.path.toLowerCase().endsWith('app.tsx') || 
          f.path.toLowerCase().endsWith('app.jsx') || 
          f.path.toLowerCase().endsWith('app.js')
        ) || window.__files[0];

        if (!primaryFile) {
          const container = document.getElementById('preview-root');
          if (container) {
            container.innerHTML = '<div style="padding: 20px; color: #ef4444;">No entry files found.<\/div>';
          }
          return;
        }

        try {
          const exports = requireModule(primaryFile.path, '');
          const Component = exports.default || exports.App || exports.Page || Object.values(exports).find(val => typeof val === 'function');
          
          if (Component) {
            const container = document.getElementById('preview-root');
            container.innerHTML = '';
            const root = ReactDOM.createRoot(container);
            root.render(React.createElement(Component));
          } else {
            throw new Error('No default or functional component exported from ' + primaryFile.path);
          }
        } catch (err) {
          console.error('Error mounting primary component:', err);
          const container = document.getElementById('preview-root');
          if (container) {
            container.innerHTML = 
              '<div style="padding: 20px; color: #ef4444; font-family: monospace; background: #1a1a1a; border-radius: 8px; border: 1px solid #ef4444; margin: 16px;">' +
                '<h3 style="margin-top: 0; font-size: 14px; font-weight: bold;">Failed to compile or mount preview:<\/h3>' +
                '<pre style="white-space: pre-wrap; font-size: 11px; margin-top: 8px;">' + (err.stack || err.message || err) + '<\/pre>' +
              '<\/div>';
          }
        }
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startRunner);
      } else {
        startRunner();
      }
    })();
  <\/script>

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
    <div className="flex flex-col h-full bg-[#0a0a0e]/60 backdrop-blur-md rounded-lg overflow-hidden border border-[#141417]/80 shadow-[0_0_20px_rgba(99,102,241,0.03)] hover:shadow-[0_0_30px_rgba(99,102,241,0.07)] transition-all duration-300">
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

          {gitHubPrUrl && (
            <>
              {/* Divider */}
              <div className="h-4 w-px bg-[#1a1a1a] mx-1" />
              <a
                href={gitHubPrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[10px] font-medium rounded px-2.5 py-1 transition-colors cursor-pointer shrink-0"
                title="View Pull Request on GitHub"
              >
                <svg className="h-3 w-3 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                <span>GitHub PR</span>
              </a>
            </>
          )}
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
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        )}
      </div>
    </div>
  )
}
