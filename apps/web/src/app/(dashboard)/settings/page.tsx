'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Startup {
  id: string
  name: string
  tagline: string | null
  description: string | null
  industry: string | null
  target_audience: string | null
  stage: string | null
  website_url: string | null
  github_repo_url: string | null
  created_at: string
}

interface Founder {
  id: string
  full_name: string
  display_name: string | null
  technical_level: 'beginner' | 'intermediate' | 'advanced'
  weekly_hours_available: number
  communication_tone: 'casual' | 'direct' | 'formal'
  preferred_agent_speed: 'fast' | 'thorough'
  primary_goal: string | null
  current_startup_id: string | null
  momentum_score: number
  streak_days: number
}

interface SubscriptionRecord {
  plan: string
  status: string
  expires_at: string
  tasks_used_this_cycle: number
  tasks_limit: number
}

interface PaymentRecord {
  id: string
  amount_usd: number
  currency: string
  status: string
  created_at: string
}

interface AgentRunRecord {
  id: string
  agent_id: string
  status: string
  error_message: string | null
  created_at: string
}

const pricingTiers = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$29',
    description: '100 tasks, all agents, manual execution only.',
    features: ['100 agent tasks / mo', 'Manual agent execution', 'Dream Engine access', 'Roadmap Builder', 'Standard speed'],
    badge: null,
  },
  {
    id: 'builder',
    name: 'Builder',
    price: '$79',
    description: '500 tasks, autonomous execution, GitHub/Gmail live.',
    features: ['500 agent tasks / mo', 'Autonomous execution', 'GitHub & Gmail integrations', 'Compass accountability checks', 'Vercel autodeploy'],
    badge: 'Popular',
  },
  {
    id: 'founder',
    name: 'Founder',
    price: '$149',
    description: 'Unlimited tasks, background autonomous agents, all integrations.',
    features: ['Unlimited tasks', 'Background autonomous agents', 'Full integrations suite', 'Dedicated memory syncs', 'Priority pipeline compute'],
    badge: null,
  },
  {
    id: 'studio',
    name: 'Studio',
    price: '$299',
    description: 'Everything + multi-project support + team seats.',
    features: ['Everything in Founder', 'Multi-project support', '2 team seats included', 'White-label reporting', 'Dedicated compute cluster'],
    badge: null,
  },
]

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  // Tabs state
  const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'advanced'>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')

  // Founder Profile State
  const [founder, setFounder] = useState<Founder | null>(null)
  const [fullName, setFullName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [weeklyHours, setWeeklyHours] = useState(20)
  const [technicalLevel, setTechnicalLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [communicationTone, setCommunicationTone] = useState<'casual' | 'direct' | 'formal'>('direct')
  const [agentSpeed, setAgentSpeed] = useState<'fast' | 'thorough'>('thorough')
  const [primaryGoal, setPrimaryGoal] = useState('')

  // Project Hub State
  const [startups, setStartups] = useState<Startup[]>([])
  const [activeStartupId, setActiveStartupId] = useState<string | null>(null)
  
  // Active Project Fields State
  const [projName, setProjName] = useState('')
  const [projTagline, setProjTagline] = useState('')
  const [projDesc, setProjDesc] = useState('')
  const [projIndustry, setProjIndustry] = useState('')
  const [projAudience, setProjAudience] = useState('')
  const [projStage, setProjStage] = useState('ideation')
  const [projWebsite, setProjWebsite] = useState('')
  const [projGithub, setProjGithub] = useState('')

  // Billing Tab State
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null)

  // Advanced Tab State
  const [agentRuns, setAgentRuns] = useState<AgentRunRecord[]>([])

  // Create Project Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newStartupName, setNewStartupName] = useState('')
  const [newStartupDesc, setNewStartupDesc] = useState('')

  // Feedback Toasts
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Parse URL tab parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab')
      if (tab === 'billing' || tab === 'advanced') {
        setActiveTab(tab)
      }
    }
  }, [])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/login')
        return
      }
      
      const uid = session.user.id
      setUserId(uid)
      setUserEmail(session.user.email || '')

      // 1. Fetch founder profile
      const { data: founderData, error: founderErr } = await supabase
        .from('founders')
        .select('*')
        .eq('id', uid)
        .maybeSingle()

      if (founderErr) throw founderErr

      if (founderData) {
        const f = founderData as Founder
        setFounder(f)
        setFullName(f.full_name || '')
        setDisplayName(f.display_name || f.full_name || '')
        setWeeklyHours(f.weekly_hours_available ?? 20)
        setTechnicalLevel(f.technical_level ?? 'intermediate')
        setCommunicationTone(f.communication_tone ?? 'direct')
        setAgentSpeed(f.preferred_agent_speed ?? 'thorough')
        setPrimaryGoal(f.primary_goal || '')
        setActiveStartupId(f.current_startup_id)
      }

      // 2. Fetch all startups of this founder
      const { data: startupsData, error: startupsErr } = await supabase
        .from('startups')
        .select('*')
        .eq('founder_id', uid)
        .order('created_at', { ascending: false })

      if (startupsErr) throw startupsErr

      if (startupsData) {
        const sList = startupsData as Startup[]
        setStartups(sList)

        // Find active startup fields
        const currentActiveId = founderData?.current_startup_id
        const activeProj = sList.find((s) => s.id === currentActiveId) || sList[0]
        if (activeProj) {
          setProjName(activeProj.name || '')
          setProjTagline(activeProj.tagline || '')
          setProjDesc(activeProj.description || '')
          setProjIndustry(activeProj.industry || '')
          setProjAudience(activeProj.target_audience || '')
          setProjStage(activeProj.stage || 'ideation')
          setProjWebsite(activeProj.website_url || '')
          setProjGithub(activeProj.github_repo_url || '')
        }
      }

      // 3. Fetch Billing Subscription details
      const { data: subRes } = await supabase
        .from('subscriptions')
        .select('plan, status, expires_at, tasks_used_this_cycle, tasks_limit')
        .eq('founder_id', uid)
        .maybeSingle()

      if (subRes) {
        setSubscription(subRes as SubscriptionRecord)
      }

      // 4. Fetch Payments history
      const { data: payRes } = await supabase
        .from('payments')
        .select('id, amount_usd, currency, status, created_at')
        .eq('founder_id', uid)
        .order('created_at', { ascending: false })

      if (payRes) {
        setPayments(payRes as PaymentRecord[])
      }

      // 5. Fetch Agent runs history
      const { data: runRes } = await supabase
        .from('agent_runs')
        .select('id, agent_id, status, error_message, created_at')
        .eq('founder_id', uid)
        .order('created_at', { ascending: false })
        .limit(10)

      if (runRes) {
        setAgentRuns(runRes as AgentRunRecord[])
      }

    } catch (err: any) {
      console.error('Error fetching settings details:', err)
      showToast(err.message || 'Failed to load details.', 'error')
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Sync active project fields
  useEffect(() => {
    if (activeStartupId && startups.length > 0) {
      const activeProj = startups.find((s) => s.id === activeStartupId)
      if (activeProj) {
        setProjName(activeProj.name || '')
        setProjTagline(activeProj.tagline || '')
        setProjDesc(activeProj.description || '')
        setProjIndustry(activeProj.industry || '')
        setProjAudience(activeProj.target_audience || '')
        setProjStage(activeProj.stage || 'ideation')
        setProjWebsite(activeProj.website_url || '')
        setProjGithub(activeProj.github_repo_url || '')
      }
    }
  }, [activeStartupId, startups])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setSaving(true)

    try {
      const { error } = await supabase
        .from('founders')
        .update({
          full_name: fullName,
          display_name: displayName,
          weekly_hours_available: weeklyHours,
          technical_level: technicalLevel,
          communication_tone: communicationTone,
          preferred_agent_speed: agentSpeed,
          primary_goal: primaryGoal
        })
        .eq('id', userId)

      if (error) throw error
      showToast('Founder profile saved successfully!')
      router.refresh()
    } catch (err: any) {
      console.error('Error saving profile:', err)
      showToast(err.message || 'Failed to save profile.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveProjectDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeStartupId) return
    setSaving(true)

    try {
      const { error } = await supabase
        .from('startups')
        .update({
          name: projName,
          tagline: projTagline,
          description: projDesc,
          industry: projIndustry,
          target_audience: projAudience,
          stage: projStage,
          website_url: projWebsite,
          github_repo_url: projGithub
        })
        .eq('id', activeStartupId)

      if (error) throw error
      
      setStartups((prev) =>
        prev.map((s) =>
          s.id === activeStartupId
            ? {
                ...s,
                name: projName,
                tagline: projTagline,
                description: projDesc,
                industry: projIndustry,
                target_audience: projAudience,
                stage: projStage,
                website_url: projWebsite,
                github_repo_url: projGithub
              }
            : s
        )
      )
      
      showToast('Project details updated successfully!')
      router.refresh()
    } catch (err: any) {
      console.error('Error updating project details:', err)
      showToast(err.message || 'Failed to update project.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSwitchProject = async (targetId: string) => {
    if (!userId || targetId === activeStartupId) return
    setLoading(true)

    try {
      const { error } = await supabase
        .from('founders')
        .update({ current_startup_id: targetId })
        .eq('id', userId)

      if (error) throw error

      await supabase
        .from('startups')
        .update({ is_active: false })
        .eq('founder_id', userId)

      await supabase
        .from('startups')
        .update({ is_active: true })
        .eq('id', targetId)

      setActiveStartupId(targetId)
      showToast('Workspace switched successfully!')
      router.refresh()
    } catch (err: any) {
      console.error('Error switching project:', err)
      showToast(err.message || 'Failed to switch workspace.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !newStartupName.trim()) return
    setLoading(true)
    setIsModalOpen(false)

    try {
      await supabase
        .from('startups')
        .update({ is_active: false })
        .eq('founder_id', userId)

      const { data: newStartup, error: startupErr } = await supabase
        .from('startups')
        .insert({
          founder_id: userId,
          name: newStartupName,
          description: newStartupDesc,
          is_active: true,
          stage: 'ideation'
        })
        .select()
        .single()

      if (startupErr || !newStartup) throw startupErr || new Error('Failed to create new startup')

      await supabase
        .from('founders')
        .update({ current_startup_id: newStartup.id })
        .eq('id', userId)

      setNewStartupName('')
      setNewStartupDesc('')
      showToast('New startup workspace initialized successfully!')
      fetchData()
    } catch (err: any) {
      console.error('Error creating project:', err)
      showToast(err.message || 'Failed to create workspace.', 'error')
      setLoading(false)
    }
  }

  // Checkout billing redirect
  const handleCheckout = async (planId: string) => {
    try {
      setSubmittingPlan(planId)
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create invoice')
      }

      const data = await response.json()
      if (data.payLink) {
        window.location.href = data.payLink
      } else {
        throw new Error('Payment gateway link was not returned.')
      }
    } catch (err: any) {
      console.error(err)
      alert(`Payment Initialization Failed: ${err.message || 'Unknown gateway error'}`)
    } finally {
      setSubmittingPlan(null)
    }
  }

  if (loading && startups.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-[#6366f1]" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
        </svg>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-10 pb-16 dash-reveal relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-8 right-8 z-50 rounded-xl px-4 py-3 text-xs font-medium shadow-xl border flex items-center gap-2.5 animate-reveal ${
          toastMessage.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${toastMessage.type === 'success' ? 'bg-emerald-400' : 'bg-rose-450'}`} />
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-[#1a1a1a] pb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-[32px] leading-[1.15] tracking-[-0.025em] text-white">
            Settings
          </h1>
          <p className="mt-2 text-[14px] text-[#737373]">
            Manage profile configurations, subscriptions, and active workspaces.
          </p>
        </div>

        {/* Tabs Control */}
        <div className="flex rounded-xl border border-[#1a1a1a] bg-[#050505] p-1 self-start sm:self-center">
          {[
            { id: 'profile', label: 'Profile & Project' },
            { id: 'billing', label: 'Billing' },
            { id: 'advanced', label: 'Advanced' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`rounded-lg px-4.5 py-2 text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === t.id
                  ? 'bg-[#6366f1] text-white'
                  : 'text-[#525252] hover:text-[#a1a1a1]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: PROFILE & PROJECT HUB */}
      {activeTab === 'profile' && (
        <div className="space-y-8 animate-reveal">
          
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Section: Profile Info */}
            <div className="dash-card p-6 space-y-6">
              <h2 className="section-label border-b border-[#1a1a1a] pb-3">
                Account Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="muted-label mb-2 block">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="dash-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="muted-label mb-2 block">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="dash-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="muted-label mb-2 block">Email Address</label>
                  <input
                    type="email"
                    value={userEmail}
                    disabled
                    className="dash-input opacity-60 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="muted-label mb-2 block">Primary Goal</label>
                  <input
                    type="text"
                    value={primaryGoal}
                    onChange={(e) => setPrimaryGoal(e.target.value)}
                    placeholder="E.g., Launch MVP to target waitlist beta"
                    className="dash-input"
                  />
                </div>
              </div>
            </div>

            {/* Section: Collaboration Settings */}
            <div className="dash-card p-6 space-y-6">
              <h2 className="section-label border-b border-[#1a1a1a] pb-3">
                Co-Founder Collaboration Settings
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="muted-label">Weekly Capacity Allocation</label>
                      <span className="text-xs font-semibold text-[#6366f1]">{weeklyHours} hours/week</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="80"
                      value={weeklyHours}
                      onChange={(e) => setWeeklyHours(parseInt(e.target.value))}
                      className="w-full accent-[#6366f1] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="muted-label mb-2 block">Technical Depth level</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['beginner', 'intermediate', 'advanced'].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setTechnicalLevel(lvl as any)}
                          className={`border text-[12px] font-semibold py-2 rounded-lg capitalize transition-all cursor-pointer ${
                            technicalLevel === lvl
                              ? 'border-[#6366f1] bg-[#6366f1]/10 text-white'
                              : 'border-[#1a1a1a] bg-[#050505] text-[#525252] hover:text-[#a1a1a1]'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="muted-label mb-2 block">Agent Speed Preference</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'fast', label: 'Fast Speed', desc: 'Accelerated feedback loops.' },
                        { key: 'thorough', label: 'Thorough Execution', desc: 'Deeper checking details.' }
                      ].map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => setAgentSpeed(s.key as any)}
                          className={`border text-left p-3 rounded-lg transition-all cursor-pointer ${
                            agentSpeed === s.key
                              ? 'border-[#6366f1] bg-[#6366f1]/10 text-white'
                              : 'border-[#1a1a1a] bg-[#050505] text-[#525252] hover:text-[#a1a1a1]'
                          }`}
                        >
                          <div className="text-[12px] font-semibold">{s.label}</div>
                          <div className="text-[11px] text-[#525252] mt-0.5">{s.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="muted-label mb-2 block">AI Communication Tone</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['casual', 'direct', 'formal'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setCommunicationTone(t as any)}
                          className={`border text-[12px] font-semibold py-2 rounded-lg capitalize transition-all cursor-pointer ${
                            communicationTone === t
                              ? 'border-[#6366f1] bg-[#6366f1]/10 text-white'
                              : 'border-[#1a1a1a] bg-[#050505] text-[#525252] hover:text-[#a1a1a1]'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="dash-btn dash-btn-primary"
              >
                {saving ? 'Saving Profile...' : 'Save Profile Settings'}
              </button>
            </div>
          </form>

          {/* Project Hub consolidated underneath */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t border-[#1a1a1a]">
            <div className="lg:col-span-2">
              <form onSubmit={handleSaveProjectDetails} className="space-y-6">
                <div className="dash-card p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-[#1a1a1a] pb-3">
                    <h2 className="section-label">Active Startup Config</h2>
                    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
                      Active Workspace
                    </span>
                  </div>

                  {activeStartupId ? (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="muted-label mb-2 block">Startup Name</label>
                          <input
                            type="text"
                            value={projName}
                            onChange={(e) => setProjName(e.target.value)}
                            required
                            className="dash-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="muted-label mb-2 block">Catchy Tagline</label>
                          <input
                            type="text"
                            value={projTagline}
                            onChange={(e) => setProjTagline(e.target.value)}
                            className="dash-input"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="muted-label mb-2 block">Concept Description</label>
                        <textarea
                          value={projDesc}
                          onChange={(e) => setProjDesc(e.target.value)}
                          rows={3}
                          className="dash-input"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-2">
                          <label className="muted-label mb-2 block">Industry</label>
                          <input
                            type="text"
                            value={projIndustry}
                            onChange={(e) => setProjIndustry(e.target.value)}
                            className="dash-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="muted-label mb-2 block">Target Audience</label>
                          <input
                            type="text"
                            value={projAudience}
                            onChange={(e) => setProjAudience(e.target.value)}
                            className="dash-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="muted-label mb-2 block">Stage</label>
                          <select
                            value={projStage}
                            onChange={(e) => setProjStage(e.target.value)}
                            className="dash-input"
                          >
                            <option value="ideation">Ideation</option>
                            <option value="validation">Validation</option>
                            <option value="building">Building</option>
                            <option value="launching">Launching</option>
                            <option value="growing">Growing</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="muted-label mb-2 block">Website URL</label>
                          <input
                            type="text"
                            value={projWebsite}
                            onChange={(e) => setProjWebsite(e.target.value)}
                            className="dash-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="muted-label mb-2 block">GitHub Repository URL</label>
                          <input
                            type="text"
                            value={projGithub}
                            onChange={(e) => setProjGithub(e.target.value)}
                            className="dash-input"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center py-10 text-[#525252]">No active startup workspace initialized.</p>
                  )}
                </div>

                {activeStartupId && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="dash-btn dash-btn-primary"
                    >
                      {saving ? 'Updating Project...' : 'Update Project Details'}
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Switch Workspace */}
            <div className="space-y-6">
              <div className="dash-card p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-[#1a1a1a] pb-3">
                  <h2 className="section-label">Your Workspaces</h2>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-[11px] font-semibold text-[#6366f1]"
                  >
                    + Create New
                  </button>
                </div>

                <div className="space-y-2.5">
                  {startups.map((s) => {
                    const isActive = s.id === activeStartupId
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleSwitchProject(s.id)}
                        className={`rounded-xl border p-3.5 flex items-center justify-between cursor-pointer transition-all hover:bg-white/[0.01] ${
                          isActive
                            ? 'border-[#6366f1]/40 bg-[#6366f1]/[0.02]'
                            : 'border-[#1a1a1a] bg-[#050505]'
                        }`}
                      >
                        <div className="min-w-0 pr-2 space-y-0.5">
                          <span className={`text-[13px] font-bold truncate block ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                            {s.name}
                          </span>
                          <span className="text-[10px] text-zinc-650 truncate block">
                            {s.tagline || s.description || 'No description.'}
                          </span>
                        </div>
                        {isActive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: BILLING TAB */}
      {activeTab === 'billing' && (
        <div className="space-y-8 animate-reveal">
          
          {/* Subscription stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#1a1a1a] border border-[#1a1a1a] rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-[#050505] p-6 space-y-2">
              <p className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#525252]">Active Tier</p>
              <p className="text-[20px] font-bold text-white capitalize">{subscription?.plan || 'Free Trial'}</p>
            </div>
            <div className="bg-[#050505] p-6 space-y-2">
              <p className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#525252]">Credits Remaining</p>
              <p className="text-[20px] font-bold text-white font-mono">
                {subscription ? subscription.tasks_limit - subscription.tasks_used_this_cycle : 20} / {subscription?.tasks_limit || 20}
              </p>
            </div>
            <div className="bg-[#050505] p-6 space-y-2">
              <p className="text-[12px] font-bold tracking-[0.06em] uppercase text-[#525252]">Status</p>
              <p className="text-[20px] font-bold text-emerald-400 capitalize">{subscription?.status || 'Active'}</p>
            </div>
          </div>

          {/* Pricing Tiers Selector */}
          <div className="space-y-4">
            <h3 className="text-[14px] font-bold tracking-[0.06em] uppercase text-[#525252]">Select a Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {pricingTiers.map((tier) => {
                const isCurrent = subscription?.plan === tier.id || (!subscription && tier.id === 'starter')
                
                return (
                  <div 
                    key={tier.id}
                    className={`border p-5 rounded-2xl flex flex-col justify-between hover:border-[#262626] transition-all ${
                      isCurrent 
                        ? 'border-[#6366f1] bg-[#6366f1]/[0.01]' 
                        : 'border-[#1a1a1a] bg-[#050505]'
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[15px] font-bold text-white">{tier.name}</span>
                        {tier.badge && (
                          <span className="text-[9px] text-[#6366f1] bg-[#6366f1]/10 px-2 py-0.5 rounded font-bold uppercase tracking-[0.05em]">
                            {tier.badge}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-baseline">
                        <span className="text-[28px] font-bold text-white font-mono">{tier.price}</span>
                        <span className="text-[11px] text-[#525252] ml-1">/mo</span>
                      </div>

                      <p className="text-[12px] text-[#737373] leading-relaxed">{tier.description}</p>
                      
                      <hr className="border-[#1a1a1a]" />
                      
                      <ul className="text-[11px] text-[#525252] space-y-2 list-disc list-inside">
                        {tier.features.map((f, idx) => (
                          <li key={idx} className="truncate">{f}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-6">
                      <button
                        onClick={() => handleCheckout(tier.id)}
                        disabled={submittingPlan === tier.id || isCurrent}
                        className={`w-full text-center text-[12px] font-bold py-2.5 rounded-xl transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-[#1a1a1a] text-[#525252] cursor-not-allowed'
                            : 'bg-white text-black hover:bg-[#e5e5e5]'
                        }`}
                      >
                        {submittingPlan === tier.id 
                          ? 'Checking out...' 
                          : isCurrent 
                          ? 'Current Plan' 
                          : `Upgrade`
                        }
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Payment History */}
          <div className="space-y-4 pt-4">
            <h3 className="text-[14px] font-bold tracking-[0.06em] uppercase text-[#525252]">Payment Transactions</h3>
            <div className="border border-[#1a1a1a] bg-[#050505] rounded-2xl overflow-hidden">
              {payments.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#1a1a1a] text-[11px] font-bold tracking-[0.06em] uppercase text-[#525252]">
                      <th className="px-6 py-4">Transaction ID</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-[#1a1a1a] last:border-0 text-[13px] hover:bg-white/[0.01]">
                        <td className="px-6 py-4 text-white font-mono text-[11px] truncate max-w-[120px]">{p.id}</td>
                        <td className="px-6 py-4 text-[#e5e5e5] font-mono">${p.amount_usd}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded text-[11px] uppercase tracking-[0.05em] font-medium ${
                            p.status === 'success' || p.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-[#525252]">{new Date(p.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-[13px] text-[#525252] text-center py-12">No billing transaction logs generated.</p>
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: ADVANCED RUNS TAB */}
      {activeTab === 'advanced' && (
        <div className="space-y-8 animate-reveal">
          
          <div className="border border-[#1a1a1a] bg-[#050505] p-6 rounded-2xl space-y-4">
            <h3 className="text-[14px] font-bold tracking-[0.06em] uppercase text-[#6366f1]">Agent Diagnostics</h3>
            <p className="text-[13px] text-[#737373] leading-relaxed">
              Verify the active execution pipelines of your 27 invisible agents here. View logs, debug statuses, and track system latency profiles.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[14px] font-bold tracking-[0.06em] uppercase text-[#525252]">Active Background Runs</h3>
            
            <div className="border border-[#1a1a1a] bg-[#050505] rounded-2xl overflow-hidden">
              {agentRuns.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#1a1a1a] text-[11px] font-bold tracking-[0.06em] uppercase text-[#525252]">
                      <th className="px-6 py-4">Run ID</th>
                      <th className="px-6 py-4">Agent Name</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Diagnostics</th>
                      <th className="px-6 py-4 text-right">Triggered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentRuns.map((run) => (
                      <tr key={run.id} className="border-b border-[#1a1a1a] last:border-0 text-[13px] hover:bg-white/[0.01]">
                        <td className="px-6 py-4 text-zinc-400 font-mono text-[11px] truncate max-w-[120px]">{run.id}</td>
                        <td className="px-6 py-4 text-white font-semibold capitalize">{run.agent_id.replace('-v1', '')}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium uppercase ${
                            run.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : run.status === 'running'
                              ? 'bg-[#6366f1]/10 text-[#6366f1]'
                              : 'bg-red-500/10 text-red-400'
                          }`}>
                            {run.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[12px] text-[#737373] max-w-xs truncate">
                          {run.error_message || 'Pipeline executing smoothly.'}
                        </td>
                        <td className="px-6 py-4 text-right text-[#525252]">{new Date(run.created_at).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-[13px] text-[#525252] text-center py-12">No active agent pipeline runs mapped.</p>
              )}
            </div>
          </div>

        </div>
      )}

      {/* CREATE STARTUP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-[#1a1a1a] bg-[#050505] p-6 space-y-6 shadow-2xl relative animate-reveal">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-[#525252] hover:text-[#a1a1a1] text-sm cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1">
              <h3 className="font-display font-bold text-xl text-white">New Startup Workspace</h3>
              <p className="text-xs text-[#a1a1a1]">Initialize a clean 90-day roadmap for your new startup concept.</p>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1">
                <label className="muted-label mb-2 block">Startup Name</label>
                <input
                  type="text"
                  required
                  placeholder="E.g., Invoicing AI"
                  value={newStartupName}
                  onChange={(e) => setNewStartupName(e.target.value)}
                  className="dash-input"
                />
              </div>

              <div className="space-y-1">
                <label className="muted-label mb-2 block">Concept Description</label>
                <textarea
                  placeholder="Describe what pain point you want to solve..."
                  value={newStartupDesc}
                  onChange={(e) => setNewStartupDesc(e.target.value)}
                  rows={3}
                  className="dash-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="dash-btn dash-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="dash-btn dash-btn-primary"
                >
                  Create & Launch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
