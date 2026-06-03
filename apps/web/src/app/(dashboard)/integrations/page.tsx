'use client'

import React, { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ErrorBoundary } from '@/components/ErrorBoundary'

interface Integration {
  id: string
  provider: string
  status: 'active' | 'inactive' | 'expired'
  connected_at: string
  last_used_at: string | null
  metadata: any
  automation_rules: any[]
}

const defaultProviders = [
  {
    id: 'github',
    name: 'GitHub',
    valueProp: 'Connect GitHub to let the Builder Agent push code and open pull requests directly in your repo.',
    icon: '💻',
    category: 'code'
  },
  {
    id: 'gmail',
    name: 'Gmail',
    valueProp: 'Connect Gmail to let the Outreach Agent draft and send discovery sequences from your personal inbox.',
    icon: '✉️',
    category: 'marketing'
  },
  {
    id: 'vercel',
    name: 'Vercel',
    valueProp: 'Connect Vercel to automatically compile and deploy staging preview branches for every feature built.',
    icon: '▲',
    category: 'code'
  },
  {
    id: 'resend',
    name: 'Resend',
    valueProp: 'Connect Resend to dispatch professional transactional welcome emails to your landing page signups.',
    icon: '📧',
    category: 'marketing'
  },
  {
    id: 'posthog',
    name: 'PostHog',
    valueProp: 'Connect PostHog to let the Analytics Agent examine user conversions and page scroll maps.',
    icon: '🦔',
    category: 'analytics'
  },
  {
    id: 'notion',
    name: 'Notion',
    valueProp: 'Connect Notion to compile decision logs, briefs, and research deliverables in your workspace database.',
    icon: '📓',
    category: 'vault'
  }
]

const prebuiltRecipes = [
  {
    id: 'recipe-1',
    title: 'Autodeploy & Review',
    description: 'When Builder Agent finishes scaffolding code -> auto-create a GitHub PR -> draft an email alert.',
    enabled: true,
    provider: 'github'
  },
  {
    id: 'recipe-2',
    title: 'Accountability Guardian',
    description: 'When Momentum Score dips below 40 -> automatically trigger the Accountability Agent to email a restart nudge.',
    enabled: false,
    provider: 'gmail'
  },
  {
    id: 'recipe-3',
    title: 'Outreach review queue',
    description: 'When Outreach campaign is drafted -> queue prospects list inside Google Sheet and notify me at 9am.',
    enabled: true,
    provider: 'gmail'
  },
  {
    id: 'recipe-4',
    title: 'Weekly Debrief dispatch',
    description: 'When sprint week ends on Friday -> compile momentum analytics and trigger Weekly Debrief dispatch email.',
    enabled: false,
    provider: 'resend'
  }
]

export default function IntegrationsPage() {
  return (
    <ErrorBoundary>
      <IntegrationsContent />
    </ErrorBoundary>
  )
}

function IntegrationsContent() {
  const supabase = createSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [recipes, setRecipes] = useState(prebuiltRecipes)

  // Fetch current integrations from db
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const { data: list } = await supabase
          .from('integrations')
          .select('*')
          .eq('founder_id', session.user.id)

        if (list) {
          setIntegrations(list as Integration[])
        }
      } catch (err) {
        console.error('Error fetching integrations:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [supabase])

  const toggleRecipe = (recipeId: string) => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, enabled: !r.enabled } : r))
    )
  }

  const handleConnectProvider = async (providerId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Mock successful integration update
      const newIntegration: Integration = {
        id: Math.random().toString(),
        provider: providerId,
        status: 'active',
        connected_at: new Date().toISOString(),
        last_used_at: null,
        metadata: { token_health: 'green', rate_limit_remaining: 450 },
        automation_rules: []
      }

      const { error } = await supabase.from('integrations').upsert({
        founder_id: session.user.id,
        provider: providerId,
        status: 'active',
        metadata: { token_health: 'green', rate_limit_remaining: 450 }
      })

      if (error) throw error

      setIntegrations((prev) => {
        const filtered = prev.filter((i) => i.provider !== providerId)
        return [...filtered, newIntegration]
      })

      alert(`✓ Deployed connection to ${providerId.toUpperCase()} successfully!`)
    } catch (err) {
      console.error(err)
      alert('Could not update connection rules.')
    }
  }

  const handleDisconnectProvider = async (providerId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await supabase
        .from('integrations')
        .delete()
        .eq('founder_id', session.user.id)
        .eq('provider', providerId)

      setIntegrations((prev) => prev.filter((i) => i.provider !== providerId))
      alert(`Disconnected ${providerId.toUpperCase()}.`)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-10 pb-16 dash-reveal">
      
      {/* Header */}
      <div className="border-b border-[#1a1a1a] pb-6">
        <h1 className="font-display font-bold text-[28px] text-white tracking-[-0.025em]">
          Integrations Hub
        </h1>
        <p className="text-[13px] text-[#737373] mt-1">
          Automate execution pipelines and link live developer accounts
        </p>
      </div>

      {/* Grid: Connect vs automation layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Level 1 Connect Providers */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#525252]">
            Level 1 — Connect Accounts
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {defaultProviders.map((prov) => {
              const connected = integrations.find((i) => i.provider === prov.id)
              
              return (
                <div 
                  key={prov.id}
                  className="border border-[#1a1a1a] bg-[#050505] p-5 rounded-2xl flex flex-col justify-between hover:border-[#262626] transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[20px]">{prov.icon}</span>
                      <h4 className="text-[15px] font-bold text-white">{prov.name}</h4>
                      {connected && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono">
                          ✓ Live
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] leading-relaxed text-[#737373]">
                      {prov.valueProp}
                    </p>
                  </div>

                  <div className="pt-4 flex justify-end">
                    {connected ? (
                      <button
                        onClick={() => handleDisconnectProvider(prov.id)}
                        className="text-[12px] font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnectProvider(prov.id)}
                        className="text-[12px] font-semibold text-[#6366f1] hover:text-[#818cf8] transition-colors cursor-pointer"
                      >
                        Link account →
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Automation Recipes & Status */}
        <div className="space-y-8">
          
          {/* Level 2 Automate recipes */}
          <div className="space-y-4">
            <h3 className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#525252]">
              Level 2 — Automate Recipes
            </h3>
            
            <div className="border border-[#1a1a1a] bg-[#050505] p-5 rounded-2xl space-y-4">
              {recipes.map((rec) => (
                <div key={rec.id} className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="text-[13px] font-bold text-white truncate">{rec.title}</p>
                    <p className="text-[12px] text-[#737373] leading-relaxed">{rec.description}</p>
                  </div>
                  <button
                    onClick={() => toggleRecipe(rec.id)}
                    className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                      rec.enabled ? 'bg-[#6366f1]' : 'bg-[#1a1a1a]'
                    }`}
                  >
                    <span 
                      className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        rec.enabled ? 'translate-x-4.5' : 'translate-x-0'
                      }`} 
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Level 3 Status details */}
          <div className="space-y-4">
            <h3 className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#525252]">
              Level 3 — Status Monitoring
            </h3>
            
            <div className="border border-[#1a1a1a] bg-[#050505] p-5 rounded-2xl space-y-3.5">
              {integrations.length > 0 ? (
                integrations.map((int) => (
                  <div key={int.id} className="flex justify-between items-center text-[12px]">
                    <div className="flex items-center gap-2 capitalize text-[#e5e5e5]">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {int.provider}
                    </div>
                    <span className="font-mono text-[#525252]">
                      Limit: {int.metadata?.rate_limit_remaining || 450} / 500
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-[#525252] text-center py-4">No active connection tokens monitored.</p>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
