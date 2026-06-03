'use client'

import React, { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ErrorBoundary } from '@/components/ErrorBoundary'

interface MemoryItem {
  id: string
  memory_type: string
  content: any
  created_at: string
}

export default function VaultPage() {
  return (
    <ErrorBoundary>
      <VaultContent />
    </ErrorBoundary>
  )
}

function VaultContent() {
  const supabase = createSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<MemoryItem[]>([])
  const [selectedItem, setSelectedItem] = useState<MemoryItem | null>(null)
  const [activeCategory, setActiveCategory] = useState<'all' | 'brief' | 'persona' | 'code' | 'research'>('all')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const { data: list } = await supabase
          .from('founder_memory')
          .select('*')
          .eq('founder_id', session.user.id)
          .order('created_at', { ascending: false })

        if (list) {
          setItems(list as MemoryItem[])
        }
      } catch (err) {
        console.error('Error fetching vault data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [supabase])

  // Fallback default assets if vault memory is empty (ensures high-fidelity demo)
  const displayItems = items.length > 0 ? items : [
    {
      id: 'default-brief',
      memory_type: 'product_brief',
      created_at: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
      content: {
        name: 'Folio',
        tagline: 'Client management designed for designers',
        elevator_pitch: 'Folio replaces the mess of Notion, Slack, and spreadsheets for creative freelancers by combining project scoping, revision tracking, and invoicing in one beautiful dashboard.',
        features: [
          { name: 'Invoicing', priority: 'must-have' },
          { name: 'Revision tracker', priority: 'must-have' },
          { name: 'Client portal', priority: 'must-have' }
        ],
        target_audience: 'Freelance designers and boutique agencies'
      }
    },
    {
      id: 'default-personas',
      memory_type: 'personas',
      created_at: new Date(Date.now() - 29 * 24 * 3600000).toISOString(),
      content: {
        personas: [
          { name: 'Mia Chen', age: 28, role: 'Freelance Brand Designer', location: 'Portland, OR', pain: 'Chasing clients for payment, manual scoping.' },
          { name: 'David Miller', age: 34, role: 'Agency Director', location: 'Denver, CO', pain: 'Feedback leakage on revisions, tracking hours.' }
        ]
      }
    },
    {
      id: 'default-research',
      memory_type: 'research',
      created_at: new Date(Date.now() - 25 * 24 * 3600000).toISOString(),
      content: {
        topic: 'Invoicing SaaS Competitor Analysis',
        findings: 'Mapped FreshBooks and HoneyBook. wedges: HoneyBook pricing table is convoluted; FreshBooks interface feels outdated for creatives.',
        competitors: ['FreshBooks', 'HoneyBook', 'Bonsai']
      }
    }
  ]

  const filteredItems = displayItems.filter((item) => {
    if (activeCategory === 'all') return true
    if (activeCategory === 'brief') return item.memory_type === 'product_brief'
    if (activeCategory === 'persona') return item.memory_type === 'personas'
    if (activeCategory === 'research') return item.memory_type === 'research' || item.memory_type === 'agent_output'
    return false
  })

  const getMemoryTypeLabel = (type: string) => {
    switch (type) {
      case 'product_brief': return 'Product Brief'
      case 'personas': return 'ICP Personas'
      case 'research': return 'Research'
      case 'agent_output': return 'Agent Output'
      default: return 'Asset'
    }
  }

  const getMemoryTypeIcon = (type: string) => {
    switch (type) {
      case 'product_brief': return '📄'
      case 'personas': return '👥'
      case 'research': return '🔍'
      case 'agent_output': return '⚙️'
      default: return '📦'
    }
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-10 pb-16 dash-reveal relative">
      
      {/* Header */}
      <div className="border-b border-[#1a1a1a] pb-6 flex justify-between items-end">
        <div>
          <h1 className="font-display font-bold text-[28px] text-white tracking-[-0.025em]">
            Founder Vault
          </h1>
          <p className="text-[13px] text-[#737373] mt-1">
            Browse and download product briefs, customer insights, and agent artifacts
          </p>
        </div>
      </div>

      {/* Categories Toolbar */}
      <div className="flex gap-4 border-b border-[#1a1a1a] pb-4">
        {[
          { id: 'all', label: 'All Assets' },
          { id: 'brief', label: 'Product Briefs' },
          { id: 'persona', label: 'ICP Personas' },
          { id: 'research', label: 'Agent Deliverables' }
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id as any)}
            className={`text-[13px] font-semibold transition-colors cursor-pointer ${
              activeCategory === cat.id ? 'text-white border-b-2 border-[#6366f1] pb-4 -mb-[18px]' : 'text-[#525252] hover:text-[#a1a1a1]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main split: File browser / preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left browser grid */}
        <div className="lg:col-span-2 space-y-3">
          {filteredItems.map((item) => (
            <div 
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className={`border p-4.5 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all hover:border-[#262626] ${
                selectedItem?.id === item.id 
                  ? 'border-[#6366f1] bg-[#6366f1]/5' 
                  : 'border-[#1a1a1a] bg-[#050505]'
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="text-[20px]">{getMemoryTypeIcon(item.memory_type)}</span>
                <div className="min-w-0">
                  <h4 className="text-[14px] font-semibold text-white truncate">
                    {item.content.name || item.content.topic || getMemoryTypeLabel(item.memory_type)}
                  </h4>
                  <p className="text-[12px] text-[#525252] font-mono mt-0.5">
                    Created: {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <span className="text-[13px] text-[#525252] hover:text-[#6366f1] transition-colors">
                View →
              </span>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="border border-[#1a1a1a] border-dashed p-16 text-center rounded-2xl text-[#525252]">
              <p className="text-[14px]">No files matching category found in the Vault.</p>
            </div>
          )}
        </div>

        {/* Right preview panel */}
        <div className="border border-[#1a1a1a] bg-[#050505] p-6 rounded-2xl space-y-5 min-h-[350px] sticky top-6">
          {selectedItem ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
                <h3 className="text-[14px] font-bold tracking-[0.06em] uppercase text-[#6366f1] flex items-center gap-2">
                  <span>{getMemoryTypeIcon(selectedItem.memory_type)}</span>
                  {getMemoryTypeLabel(selectedItem.memory_type)}
                </h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedItem.content, null, 2))
                    alert('✓ Output payload copied to clipboard!')
                  }}
                  className="text-[12px] font-semibold text-[#a1a1a1] hover:text-white transition-colors cursor-pointer"
                >
                  Copy JSON
                </button>
              </div>

              <div className="space-y-3.5">
                {selectedItem.memory_type === 'product_brief' && (
                  <>
                    <div>
                      <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-[#525252]">Startup Name</p>
                      <p className="text-[15px] font-semibold text-white">{selectedItem.content.name}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-[#525252]">Tagline</p>
                      <p className="text-[14px] text-[#e5e5e5]">{selectedItem.content.tagline}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-[#525252]">Features</p>
                      <div className="space-y-1 mt-1">
                        {selectedItem.content.features?.map((f: any, i: number) => (
                          <div key={i} className="text-[13px] text-[#737373] flex justify-between">
                            <span>{f.name}</span>
                            <span className="text-[11px] text-[#6366f1] font-semibold uppercase">{f.priority}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {selectedItem.memory_type === 'personas' && (
                  <div className="space-y-3">
                    {selectedItem.content.personas?.map((p: any, i: number) => (
                      <div key={i} className="border border-[#1a1a1a] p-3.5 rounded-xl space-y-1">
                        <p className="text-[13px] font-bold text-white">{p.name} ({p.age})</p>
                        <p className="text-[11px] text-[#6366f1]">{p.role} · {p.location}</p>
                        <p className="text-[12px] text-[#737373] leading-relaxed mt-1">{p.pain}</p>
                      </div>
                    ))}
                  </div>
                )}

                {selectedItem.memory_type === 'research' && (
                  <>
                    <div>
                      <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-[#525252]">Research Question</p>
                      <p className="text-[14px] font-semibold text-white leading-snug">{selectedItem.content.topic}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-[#525252]">Key Findings</p>
                      <p className="text-[13px] text-[#e5e5e5] leading-relaxed mt-1">{selectedItem.content.findings}</p>
                    </div>
                  </>
                )}

                {selectedItem.memory_type === 'agent_output' && (
                  <>
                    <div>
                      <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-[#525252]">Task Title</p>
                      <p className="text-[14px] font-semibold text-white leading-snug">{selectedItem.content.task_title}</p>
                    </div>
                    <div className="bg-[#0a0a0a] rounded-lg p-3 max-h-40 overflow-y-auto text-[11px] font-mono text-[#737373] scrollbar-thin border border-[#1a1a1a]">
                      {JSON.stringify(selectedItem.content.output, null, 2)}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#525252] py-20">
              <span className="text-[32px] mb-2">📁</span>
              <p className="text-[14px]">Select an asset card from the browser to inspect its detailed specifications.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
