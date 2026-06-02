'use client'

import React, { useState, useEffect } from 'react'
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
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [activeTab, setActiveTab] = useState<'profile' | 'projects'>('profile')
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

  // Create Project Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newStartupName, setNewStartupName] = useState('')
  const [newStartupDesc, setNewStartupDesc] = useState('')

  // Feedback Toasts / Messages
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3000)
  }

  const fetchData = async () => {
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

    } catch (err: any) {
      console.error('Error fetching settings details:', err)
      showToast(err.message || 'Failed to load details.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Sync active project fields when activeStartupId or startups list change
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
      console.error('Error saving founder profile:', err)
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
      
      // Update local state list to reflect the updated active startup name
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
      // 1. Update founder active startup in DB
      const { error } = await supabase
        .from('founders')
        .update({ current_startup_id: targetId })
        .eq('id', userId)

      if (error) throw error

      // 2. Set all other startups to inactive, and target to active
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
      // 1. Make all current startups inactive in DB
      await supabase
        .from('startups')
        .update({ is_active: false })
        .eq('founder_id', userId)

      // 2. Insert new startup
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

      if (startupErr || !newStartup) throw startupErr || new Error('Failed to create new startup record')

      // 3. Update founder record current_startup_id
      const { error: founderErr } = await supabase
        .from('founders')
        .update({ current_startup_id: newStartup.id })
        .eq('id', userId)

      if (founderErr) throw founderErr

      // 4. Create default 90-day roadmap for new startup
      const { data: newRoadmap, error: roadmapErr } = await supabase
        .from('roadmaps')
        .insert({
          startup_id: newStartup.id,
          founder_id: userId,
          title: '90-Day Roadmap',
          is_active: true,
          start_date: new Date().toISOString().split('T')[0],
          phases: [
            {
              phase_number: 1,
              title: "Validation & Testing",
              theme: "Drafting waitlists and conducting landing page validation.",
              weekly_goals: [
                { week_number: 1, focus: "Market discovery", goals: ["Define 3 competitor wedges", "Conduct 3 customer pain interviews"], estimated_hours: weeklyHours },
                { week_number: 2, focus: "Value brief", goals: ["Draft product brief concept", "Build waitlist landing page"], estimated_hours: weeklyHours },
                { week_number: 3, focus: "Traction launch", goals: ["Deploy conversion triggers", "Promote waitlist landing page"], estimated_hours: weeklyHours },
                { week_number: 4, focus: "Review data", goals: ["Analyze signup conversion metrics", "Set sprint targets for build phase"], estimated_hours: weeklyHours }
              ]
            },
            {
              phase_number: 2,
              title: "Product Execution",
              theme: "Structuring schema and coding core UI layouts.",
              weekly_goals: [
                { week_number: 5, focus: "DB setup", goals: ["Setup database tables & policies", "Configure authentication configurations"], estimated_hours: weeklyHours },
                { week_number: 6, focus: "UI wireframes", goals: ["Create frontend core layouts", "Connect state provider models"], estimated_hours: weeklyHours },
                { week_number: 7, focus: "Integration test", goals: ["Wire up external endpoints", "Enable payment testing portals"], estimated_hours: weeklyHours },
                { week_number: 8, focus: "Bug debugging", goals: ["Fix application functional bugs", "Prepare staging demo release"], estimated_hours: weeklyHours }
              ]
            },
            {
              phase_number: 3,
              title: "Launch & Growth Loop",
              theme: "Releasing MVP to private beta and starting outreach campaigns.",
              weekly_goals: [
                { week_number: 9, focus: "Beta launch", goals: ["Onboard first 5 beta users", "Configure bug reporter forms"], estimated_hours: weeklyHours },
                { week_number: 10, focus: "Outreach campaigns", goals: ["Write B2B campaign copies", "Deploy automated agents outreach"], estimated_hours: weeklyHours },
                { week_number: 11, focus: "Launch announcements", goals: ["Publish launches on ProductHunt/HN", "Drive outreach leads list"], estimated_hours: weeklyHours },
                { week_number: 12, focus: "Scale metrics", goals: ["Evaluate feedback retention logs", "Outline Phase 4 iterations"], estimated_hours: weeklyHours }
              ]
            }
          ]
        })
        .select()
        .single()

      if (roadmapErr || !newRoadmap) {
        console.error('Roadmap auto-provisioning failure:', roadmapErr)
      } else {
        // 5. Insert Sprint 1 and 2 automatically
        const baseDate = new Date()
        for (const phase of newRoadmap.phases) {
          if (Array.isArray(phase.weekly_goals)) {
            for (const weeklyGoal of phase.weekly_goals) {
              const weekNum = weeklyGoal.week_number ?? 1
              const startOffset = (weekNum - 1) * 7 * 24 * 60 * 60 * 1000
              const sprintStart = new Date(baseDate.getTime() + startOffset)
              const sprintEnd = new Date(sprintStart.getTime() + 6 * 24 * 60 * 60 * 1000)

              const { data: spInserted } = await supabase
                .from('sprints')
                .insert({
                  roadmap_id: newRoadmap.id,
                  founder_id: userId,
                  sprint_number: weekNum,
                  title: `Sprint ${weekNum} — ${weeklyGoal.focus || 'Development'}`,
                  week_start: sprintStart.toISOString().split('T')[0],
                  week_end: sprintEnd.toISOString().split('T')[0],
                  goals: weeklyGoal.goals || [],
                  focus_area: weeklyGoal.focus || 'Build',
                  capacity_hours: weeklyGoal.estimated_hours || weeklyHours || 20,
                  status: weekNum === 1 ? 'active' : 'planned'
                })
                .select()
                .single()

              if (spInserted && Array.isArray(weeklyGoal.goals)) {
                const tasksPayload = weeklyGoal.goals.map((gText: string) => {
                  const estH = Math.round((weeklyGoal.estimated_hours || weeklyHours || 20) / weeklyGoal.goals.length)
                  return {
                    sprint_id: spInserted.id,
                    founder_id: userId,
                    title: gText,
                    description: `Automated roadmap task for Week ${weekNum}`,
                    priority: 3,
                    estimated_hours: estH > 0 ? estH : 2,
                    status: 'todo',
                    category: 'other'
                  }
                })
                if (tasksPayload.length > 0) {
                  await supabase.from('tasks').insert(tasksPayload)
                }
              }
            }
          }
        }
      }

      // Reset values
      setNewStartupName('')
      setNewStartupDesc('')
      showToast('New startup workspace initialized successfully!')
      fetchData()
    } catch (err: any) {
      console.error('Error creating new project:', err)
      showToast(err.message || 'Failed to create workspace.', 'error')
      setLoading(false)
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
    <div className="mx-auto max-w-[1000px] space-y-10 pb-16 dash-reveal">
      
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
          <h1 className="font-display font-bold text-[clamp(28px,3.5vw,36px)] leading-[1.15] tracking-[-0.025em] text-white">
            Settings
          </h1>
          <p className="mt-2 text-[15px] text-[#737373]">
            Manage your founder profile configuration, active startup data, and workspaces.
          </p>
        </div>

        {/* Tabs Control */}
        <div className="flex rounded-lg border border-[#1a1a1a] bg-[#050505] p-1 self-start sm:self-center">
          <button
            onClick={() => setActiveTab('profile')}
            className={`rounded-md px-4 py-2 text-[13px] font-medium transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#6366f1] text-white'
                : 'text-[#525252] hover:text-[#a1a1a1]'
            }`}
          >
            Founder Profile
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`rounded-md px-4 py-2 text-[13px] font-medium transition-all cursor-pointer ${
              activeTab === 'projects'
                ? 'bg-[#6366f1] text-white'
                : 'text-[#525252] hover:text-[#a1a1a1]'
            }`}
          >
            Project Hub
          </button>
        </div>
      </div>

      {/* TAB 1: FOUNDER PROFILE */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6 animate-reveal">
          
          {/* Section: Profile Info */}
          <div className="dash-card p-6 space-y-6">
            <h2 className="section-label border-b border-[#1a1a1a] pb-3">
              Account Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="muted-label mb-2 block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="dash-input"
                />
              </div>
              <div className="space-y-2">
                <label className="muted-label mb-2 block">
                  Display Name
                </label>
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
                <label className="muted-label mb-2 block">
                  Email Address
                </label>
                <input
                  type="email"
                  value={userEmail}
                  disabled
                  className="dash-input opacity-60 cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="muted-label mb-2 block">
                  Primary Goal
                </label>
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
                    <label className="muted-label">
                      Weekly Capacity Allocation
                    </label>
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
                  <label className="muted-label mb-2 block">
                    Technical Depth level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['beginner', 'intermediate', 'advanced'].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setTechnicalLevel(lvl as any)}
                        className={`border text-[12px] font-medium py-2 rounded-lg capitalize transition-all cursor-pointer ${
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
                  <label className="muted-label mb-2 block">
                    Agent Verification Level
                  </label>
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
                        <div className="text-[12px] font-medium">{s.label}</div>
                        <div className="text-[11px] text-[#525252] mt-0.5">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="muted-label mb-2 block">
                    AI Communication Tone
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['casual', 'direct', 'formal'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCommunicationTone(t as any)}
                        className={`border text-[12px] font-medium py-2 rounded-lg capitalize transition-all cursor-pointer ${
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

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={fetchData}
              className="dash-btn dash-btn-secondary"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={saving}
              className="dash-btn dash-btn-primary"
            >
              {saving ? 'Saving Profile...' : 'Save Profile Settings'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: PROJECT HUB */}
      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-reveal">
          
          {/* Left: Active Project details form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveProjectDetails} className="space-y-6">
              
              <div className="dash-card p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-[#1a1a1a] pb-3">
                  <h2 className="section-label">
                    Active Startup Config
                  </h2>
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
                    Active Workspace
                  </span>
                </div>

                {activeStartupId ? (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="muted-label mb-2 block">
                          Startup Name
                        </label>
                        <input
                          type="text"
                          value={projName}
                          onChange={(e) => setProjName(e.target.value)}
                          required
                          className="dash-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="muted-label mb-2 block">
                          Catchy Tagline
                        </label>
                        <input
                          type="text"
                          value={projTagline}
                          onChange={(e) => setProjTagline(e.target.value)}
                          className="dash-input"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="muted-label mb-2 block">
                        Concept / Idea Description
                      </label>
                      <textarea
                        value={projDesc}
                        onChange={(e) => setProjDesc(e.target.value)}
                        rows={3}
                        className="dash-input"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-2">
                        <label className="muted-label mb-2 block">
                          Industry
                        </label>
                        <input
                          type="text"
                          value={projIndustry}
                          onChange={(e) => setProjIndustry(e.target.value)}
                          className="dash-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="muted-label mb-2 block">
                          Target Audience
                        </label>
                        <input
                          type="text"
                          value={projAudience}
                          onChange={(e) => setProjAudience(e.target.value)}
                          className="dash-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="muted-label mb-2 block">
                          Stage
                        </label>
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
                        <label className="muted-label mb-2 block">
                          Website URL
                        </label>
                        <input
                          type="text"
                          value={projWebsite}
                          onChange={(e) => setProjWebsite(e.target.value)}
                          placeholder="https://myproduct.com"
                          className="dash-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="muted-label mb-2 block">
                          GitHub Repository URL
                        </label>
                        <input
                          type="text"
                          value={projGithub}
                          onChange={(e) => setProjGithub(e.target.value)}
                          placeholder="https://github.com/myusername/myrepo"
                          className="dash-input"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-[#525252] text-xs">
                    No active startup loaded. Switch to a workspace on the right.
                  </div>
                )}
              </div>

              {activeStartupId && (
                <div className="flex justify-end gap-3">
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

          {/* Right: Workspace Switcher list */}
          <div className="space-y-6">
            <div className="dash-card p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-[#1a1a1a] pb-3">
                <h2 className="section-label">
                  Your Workspaces
                </h2>
                
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-[11px] font-medium text-[#6366f1] hover:text-[#5558e6] transition-colors cursor-pointer"
                >
                  + Create New
                </button>
              </div>

              {/* Workspace switcher list */}
              <div className="space-y-2.5">
                {startups.map((s) => {
                  const isActive = s.id === activeStartupId
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSwitchProject(s.id)}
                      className={`rounded-lg border p-3 flex items-center justify-between cursor-pointer transition-all hover:bg-white/[0.01] ${
                        isActive
                          ? 'border-[#6366f1]/40 bg-[#6366f1]/[0.02]'
                          : 'border-[#1a1a1a] bg-[#050505]'
                      }`}
                    >
                      <div className="space-y-0.5 truncate pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`}>
                            {s.name}
                          </span>
                          {isActive && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-650 truncate block">
                          {s.tagline || s.description || 'No concept description.'}
                        </span>
                      </div>
                      
                      {!isActive && (
                        <span className="text-[11px] font-medium text-[#525252] group-hover:text-zinc-300">
                          Switch &rarr;
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* CREATE STARTUP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-[#1a1a1a] bg-[#050505] p-6 space-y-6 shadow-2xl relative animate-reveal">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#525252] hover:text-[#a1a1a1] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

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
