'use client'

import React, { useState, useEffect } from 'react'
import { useForgeStore } from '@/lib/studio/forge-store'
import { useForgeContext } from '@/lib/studio/forge-context'
import { X } from 'lucide-react'

export default function VisualEditPanel() {
  const selectedElement = useForgeStore((s) => s.selectedElement)
  const setSelectedElement = useForgeStore((s) => s.setSelectedElement)
  const showVisualEdit = useForgeStore((s) => s.showVisualEdit)
  const setShowVisualEdit = useForgeStore((s) => s.setShowVisualEdit)
  const { triggerBuild } = useForgeContext()

  const [text, setText] = useState('')
  const [bg, setBg] = useState('')
  const [color, setColor] = useState('')
  const [border, setBorder] = useState('')

  useEffect(() => {
    if (selectedElement) {
      setText(selectedElement.text)
      setBg('')
      setColor('')
      setBorder('')
    }
  }, [selectedElement])

  if (!showVisualEdit || !selectedElement) return null

  const handleSave = () => {
    let userPrompt = `Modify element '${selectedElement.selector}'`
    if (text !== selectedElement.text) userPrompt += ` to have text content: "${text}"`
    if (bg) userPrompt += ` with background styles: "${bg}"`
    if (color) userPrompt += ` with text color classes: "${color}"`
    if (border) userPrompt += ` with border styling: "${border}"`

    // Close panel
    setShowVisualEdit(false)
    setSelectedElement(null)

    // Run build
    void triggerBuild(userPrompt)
  }

  const handleClose = () => {
    setShowVisualEdit(false)
    setSelectedElement(null)
  }

  return (
    <div className="w-80 bg-[#0c0c12]/95 border-l border-zinc-900 shadow-2xl p-4 flex flex-col h-full animate-in slide-in-from-right duration-250 z-30 shrink-0">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
        <div className="space-y-0.5">
          <h3 className="text-[12px] font-semibold text-white">Visual Edit Panel</h3>
          <p className="text-[9px] text-zinc-500 font-mono truncate max-w-[200px]" title={selectedElement.selector}>
            {selectedElement.selector}
          </p>
        </div>
        <button 
          onClick={handleClose}
          className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/[0.03] transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0 forge-scroll">
        {/* Text Input */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Content Text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full bg-zinc-950 border border-zinc-900 rounded-lg p-2 text-[12px] text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
            placeholder="Edit text content..."
          />
        </div>

        {/* Color Palette */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Background Tint</label>
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { label: 'Indigo', value: 'bg-indigo-500/10 border-indigo-500/30' },
              { label: 'Emerald', value: 'bg-emerald-500/10 border-emerald-500/30' },
              { label: 'Rose', value: 'bg-rose-500/10 border-rose-500/30' },
              { label: 'Amber', value: 'bg-amber-500/10 border-amber-500/30' },
              { label: 'Slate', value: 'bg-zinc-800/20 border-zinc-700/30' },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => setBg(opt.value)}
                className={`h-7 rounded border text-[9px] text-zinc-400 flex items-center justify-center transition-all cursor-pointer ${opt.value} ${
                  bg === opt.value ? 'ring-2 ring-indigo-500 border-transparent text-white font-semibold' : 'hover:text-zinc-200'
                }`}
              >
                {opt.label[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Text Color */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Text Accent</label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'White', value: 'text-white' },
              { label: 'Gray', value: 'text-zinc-400' },
              { label: 'Indigo', value: 'text-indigo-400' },
              { label: 'Emerald', value: 'text-emerald-400' },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => setColor(opt.value)}
                className={`h-7 rounded border border-zinc-900 bg-zinc-950 text-[10px] flex items-center justify-center transition-all cursor-pointer ${opt.value} ${
                  color === opt.value ? 'ring-2 ring-indigo-500 border-transparent' : 'hover:border-zinc-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Border radius */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Border Styling</label>
          <select
            value={border}
            onChange={(e) => setBorder(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-900 rounded-lg p-2 text-[12px] text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Default border</option>
            <option value="border border-white/10">Thin Border</option>
            <option value="border border-indigo-500/20">Indigo Glow Border</option>
            <option value="border-none">No Border</option>
          </select>
        </div>
      </div>

      <div className="border-t border-zinc-900 pt-4 flex gap-3 shrink-0">
        <button
          onClick={handleClose}
          className="flex-1 h-9 rounded-lg border border-zinc-900 hover:bg-zinc-950 text-[12px] font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex-1 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[12px] font-medium text-white shadow-lg shadow-indigo-600/10 transition-colors cursor-pointer"
        >
          Apply Edits
        </button>
      </div>
    </div>
  )
}
