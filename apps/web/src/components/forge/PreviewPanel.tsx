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
  
  const returnIdx = searchArea.search(/return\s*\(/);
  if (returnIdx !== -1) {
    const openParenIdx = searchArea.indexOf('(', returnIdx);
    if (openParenIdx !== -1) {
      let depth = 1;
      let i = openParenIdx + 1;
      for (; i < searchArea.length; i++) {
        if (searchArea[i] === '(') depth++;
        else if (searchArea[i] === ')') {
          depth--;
          if (depth === 0) {
            return searchArea.slice(openParenIdx + 1, i);
          }
        }
      }
    }
  }

  const singleLineMatch = searchArea.match(/return\s+(<[\s\S]*?>);/);
  if (singleLineMatch && singleLineMatch[1]) {
    return singleLineMatch[1];
  }
  return '';
};

const extractProps = (attributes: string): Record<string, string> => {
  const props: Record<string, string> = {};
  if (!attributes) return props;
  
  // Match string props: title="Hello" or title='Hello'
  const stringPropRegex = /([a-zA-Z0-9_]+)\s*=\s*["']([^"']*)["']/g;
  let match;
  while ((match = stringPropRegex.exec(attributes)) !== null) {
    props[match[1]] = match[2];
  }
  
  // Match expression props: icon={<IconFeature1SVG />} or isHighlighted={true}
  const exprPropRegex = /([a-zA-Z0-9_]+)\s*=\s*\{([^}]+)\}/g;
  while ((match = exprPropRegex.exec(attributes)) !== null) {
    props[match[1]] = match[2].trim();
  }

  // Match boolean shorthand props: isHighlighted
  const words = attributes.match(/\b[a-zA-Z0-9_]+\b/g);
  if (words) {
    words.forEach(w => {
      const pattern = new RegExp(`\\b${w}\\b\\s*=`);
      if (!pattern.test(attributes) && w !== 'class' && w !== 'className' && w !== 'style' && w !== 'id') {
        props[w] = 'true';
      }
    });
  }
  
  return props;
};

const extractLocalVariables = (fileContent: string): Record<string, string> => {
  const vars: Record<string, string> = {};
  if (!fileContent) return vars;
  
  // Match const name = "value"; or let name = 'value';
  const varRegex = /(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*["']([^"']*)["']/g;
  let match;
  while ((match = varRegex.exec(fileContent)) !== null) {
    vars[match[1]] = match[2];
  }
  
  return vars;
};

const extractLocalComponentReturn = (fileContent: string, componentName: string): string => {
  const regex = new RegExp(`(?:function|const|let)\\s+${componentName}\\b`);
  const match = fileContent.match(regex);
  if (!match || match.index === undefined) return '';
  
  const searchArea = fileContent.slice(match.index);
  
  // Try to find standard return (...) block
  const returnMatch = searchArea.match(/return\s*\(\s*([\s\S]*?)\s*\)/);
  if (returnMatch) return returnMatch[1];
  
  // Try to find standard return ... without parens (single line)
  const returnSingleLine = searchArea.match(/return\s+(<[\s\S]*?>);/);
  if (returnSingleLine) return returnSingleLine[1];

  // Try to find arrow function direct return: const Component = () => ( ... )
  const arrowIndex = searchArea.indexOf('=>');
  if (arrowIndex !== -1 && arrowIndex < 200) {
    const postArrow = searchArea.slice(arrowIndex + 2).trim();
    if (postArrow.startsWith('(')) {
      let depth = 0;
      let i = 0;
      for (; i < postArrow.length; i++) {
        if (postArrow[i] === '(') depth++;
        else if (postArrow[i] === ')') {
          depth--;
          if (depth === 0) break;
        }
      }
      return postArrow.slice(1, i).trim();
    } else if (postArrow.startsWith('<')) {
      const tagMatch = postArrow.match(/^(<[\s\S]*?>)(?:;|\n|$)/);
      if (tagMatch) return tagMatch[1];
    }
  }
  
  return '';
};

interface JSXNode {
  type: 'text' | 'tag';
  content?: string;
  tagName?: string;
  attributes?: string;
  children?: string;
}

const parseJSXNodes = (jsx: string): JSXNode[] => {
  const nodes: JSXNode[] = [];
  let i = 0;
  
  while (i < jsx.length) {
    const nextTagIndex = jsx.indexOf('<', i);
    if (nextTagIndex === -1) {
      nodes.push({ type: 'text', content: jsx.slice(i) });
      break;
    }
    
    if (nextTagIndex > i) {
      nodes.push({ type: 'text', content: jsx.slice(i, nextTagIndex) });
      i = nextTagIndex;
    }
    
    if (jsx.startsWith('<!--', i)) {
      const commentEnd = jsx.indexOf('-->', i);
      if (commentEnd === -1) {
        nodes.push({ type: 'text', content: jsx.slice(i) });
        break;
      }
      nodes.push({ type: 'text', content: jsx.slice(i, commentEnd + 3) });
      i = commentEnd + 3;
      continue;
    }
    
    if (jsx[i + 1] === '/') {
      const tagEnd = jsx.indexOf('>', i);
      if (tagEnd === -1) {
        nodes.push({ type: 'text', content: jsx.slice(i) });
        break;
      }
      nodes.push({ type: 'text', content: jsx.slice(i, tagEnd + 1) });
      i = tagEnd + 1;
      continue;
    }
    
    const tagMatch = jsx.slice(i).match(/^<([a-zA-Z0-9.:_-]+)/);
    if (!tagMatch) {
      nodes.push({ type: 'text', content: '<' });
      i++;
      continue;
    }
    
    const tagName = tagMatch[1];
    let tagStart = i;
    i += tagMatch[0].length;
    
    let attributes = '';
    let inQuote = false;
    let quoteChar = '';
    let braceDepth = 0;
    let isSelfClosing = false;
    
    while (i < jsx.length) {
      const char = jsx[i];
      
      if (!inQuote && braceDepth === 0) {
        if (char === '"' || char === "'") {
          inQuote = true;
          quoteChar = char;
        } else if (char === '{') {
          braceDepth = 1;
        } else if (char === '/' && jsx[i + 1] === '>') {
          isSelfClosing = true;
          i += 2;
          break;
        } else if (char === '>') {
          i++;
          break;
        }
      } else if (inQuote) {
        if (char === quoteChar) {
          inQuote = false;
        }
      } else if (braceDepth > 0) {
        if (char === '{') braceDepth++;
        else if (char === '}') braceDepth--;
      }
      
      attributes += char;
      i++;
    }
    
    if (isSelfClosing) {
      nodes.push({ type: 'tag', tagName, attributes, children: '' });
      continue;
    }
    
    let depth = 1;
    let childrenStart = i;
    let childrenEnd = i;
    
    while (i < jsx.length) {
      if (jsx[i] === '<') {
        if (jsx[i + 1] === '/') {
          const closeMatch = jsx.slice(i).match(/^<\/([a-zA-Z0-9.:_-]+)>/);
          if (closeMatch && closeMatch[1] === tagName) {
            depth--;
            if (depth === 0) {
              childrenEnd = i;
              i += closeMatch[0].length;
              break;
            }
          }
        } else {
          const openMatch = jsx.slice(i).match(/^<([a-zA-Z0-9.:_-]+)\b/);
          if (openMatch && openMatch[1] === tagName) {
            depth++;
          }
        }
      }
      i++;
    }
    
    if (depth > 0) {
      nodes.push({ type: 'text', content: jsx.slice(tagStart, childrenStart) });
      i = childrenStart;
      continue;
    }
    
    const children = jsx.slice(childrenStart, childrenEnd);
    nodes.push({ type: 'tag', tagName, attributes, children });
  }
  
  return nodes;
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
  const nodes = parseJSXNodes(resolved);
  const resolvedNodes = nodes.map(node => {
    if (node.type === 'text') {
      return node.content;
    }

    const TagName = node.tagName!;
    const attributes = node.attributes!;
    const children = node.children!;

    // Strip Framer Motion prefix (motion.div -> div, motion.section -> section, etc.)
    let cleanTagName = TagName;
    if (TagName.startsWith('motion.')) {
      cleanTagName = TagName.slice(7);
    }

    // Convert Next.js Image component to standard img tag
    if (cleanTagName === 'Image' || cleanTagName === 'img') {
      const srcMatch = attributes.match(/src=\s*\{?["']?([^"'}]+)["']?\}?/);
      const src = srcMatch ? srcMatch[1] : '';
      const altMatch = attributes.match(/alt=\s*\{?["']?([^"'}]+)["']?\}?/);
      const alt = altMatch ? altMatch[1] : '';
      
      const classNameMatch = attributes.match(/className=\s*\{?["']?([^"'}]+)["']?\}?/);
      const cls = classNameMatch ? classNameMatch[1] : '';
      
      return `<img src="${src}" alt="${alt}" class="${cls}" style="object-fit: cover; width: 100%; height: 100%;" />`;
    }

    const isStandardHtml = cleanTagName[0] === cleanTagName[0].toLowerCase();

    if (isStandardHtml) {
      const resolvedChildren = children ? resolveJSX(children, currentFile, files, depth + 1) : '';
      const closedTag = children === '' && !attributes.includes('children') ? ' />' : `>${resolvedChildren}</${cleanTagName}>`;
      const cleanedAttrs = attributes
        .replace(/className=/g, 'class=')
        .replace(/onClick=\{[^}]+\}/g, '')
        .replace(/onChange=\{[^}]+\}/g, '')
        .replace(/onSubmit=\{[^}]+\}/g, '');
      return `<${cleanTagName}${cleanedAttrs}${closedTag}`;
    }

    const resolvedChildren = children ? resolveJSX(children, currentFile, files, depth + 1) : '';

    if (uiComponentsMap[cleanTagName]) {
      return uiComponentsMap[cleanTagName](attributes, resolvedChildren);
    }

    if (importsMap[cleanTagName]) {
      const matchedFile = findFileByImport(cleanTagName, importsMap[cleanTagName], files);
      if (matchedFile) {
        let returnBlock = extractReturnBlock(matchedFile.content);
        if (resolvedChildren) {
          returnBlock = returnBlock.replace(/\{\s*children\s*\}/g, resolvedChildren);
        } else {
          returnBlock = returnBlock.replace(/\{\s*children\s*\}/g, '');
        }

        // Pass props
        const props = extractProps(attributes);
        Object.keys(props).forEach(propName => {
          const propValue = props[propName];
          const resolvedVal = resolveJSX(propValue, currentFile, files, depth + 1);
          const propRegex = new RegExp(`\\{\\s*(?:props\\.)?${propName}\\s*\\}`, 'g');
          returnBlock = returnBlock.replace(propRegex, resolvedVal);
        });

        // Resolve local variables
        const localVars = extractLocalVariables(matchedFile.content);
        Object.keys(localVars).forEach(varName => {
          const varValue = localVars[varName];
          const varRegex = new RegExp(`\\{\\s*${varName}\\s*\\}`, 'g');
          returnBlock = returnBlock.replace(varRegex, varValue);
        });

        return resolveJSX(returnBlock, matchedFile, files, depth + 1);
      }
    }

    const isLocalComponent = currentFile && (
      currentFile.content.includes(`function ${cleanTagName}`) ||
      currentFile.content.includes(`const ${cleanTagName}`) ||
      currentFile.content.includes(`let ${cleanTagName}`)
    );

    if (isLocalComponent) {
      let returnBlock = extractLocalComponentReturn(currentFile.content, cleanTagName);
      if (returnBlock) {
        if (resolvedChildren) {
          returnBlock = returnBlock.replace(/\{\s*children\s*\}/g, resolvedChildren);
        } else {
          returnBlock = returnBlock.replace(/\{\s*children\s*\}/g, '');
        }

        // Pass props
        const props = extractProps(attributes);
        Object.keys(props).forEach(propName => {
          const propValue = props[propName];
          const resolvedVal = resolveJSX(propValue, currentFile, files, depth + 1);
          const propRegex = new RegExp(`\\{\\s*(?:props\\.)?${propName}\\s*\\}`, 'g');
          returnBlock = returnBlock.replace(propRegex, resolvedVal);
        });

        // Resolve local variables
        const localVars = extractLocalVariables(currentFile.content);
        Object.keys(localVars).forEach(varName => {
          const varValue = localVars[varName];
          const varRegex = new RegExp(`\\{\\s*${varName}\\s*\\}`, 'g');
          returnBlock = returnBlock.replace(varRegex, varValue);
        });

        return resolveJSX(returnBlock, currentFile, files, depth + 1);
      }
    }

    return resolvedChildren || `<div class="p-4 border border-zinc-800 text-zinc-500 rounded text-center text-xs font-mono">&lt;${cleanTagName} /&gt;</div>`;
  });

  resolved = resolvedNodes.join('');

  // Resolve local variables from currentFile for final text elements
  if (currentFile) {
    const localVars = extractLocalVariables(currentFile.content);
    Object.keys(localVars).forEach(varName => {
      const varValue = localVars[varName];
      const varRegex = new RegExp(`\\{\\s*${varName}\\s*\\}`, 'g');
      resolved = resolved.replace(varRegex, varValue);
    });
  }

  // Clean up remaining React/JS curly brace expressions
  resolved = resolved.replace(/\{\s*new\s+Date\(\)\.getFullYear\(\)\s*\}/g, String(new Date().getFullYear()));
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
              sandbox="allow-scripts"
            />
          </div>
        )}
      </div>
    </div>
  )
}
