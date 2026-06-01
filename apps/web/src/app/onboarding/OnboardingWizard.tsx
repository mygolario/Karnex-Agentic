'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Goal {
  week_number: number
  focus: string
  goals: string[]
  estimated_hours: number
}

interface Phase {
  phase_number: number
  title: string
  theme: string
  weekly_goals: Goal[]
}

interface Roadmap {
  title: string
  phases: Phase[]
}

interface OnboardingWizardProps {
  initialName: string
}

export default function OnboardingWizard({ initialName }: OnboardingWizardProps) {
  const router = useRouter()

  // Onboarding wizard steps: 1 (AI Chat), 2 (Refine Startup), 3 (Founder Prefs), 4 (Blueprint)
  const [step, setStep] = useState(1)

  // Step 1: Idea Input & AI Analysis
  const [description, setDescription] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([])

  // Step 2: Extracted Startup Profile
  const [startupName, setStartupName] = useState('')
  const [tagline, setTagline] = useState('')
  const [industry, setIndustry] = useState('SaaS')
  const [targetAudience, setTargetAudience] = useState('')
  const [stage, setStage] = useState<'ideation' | 'validation' | 'building' | 'launching' | 'growing'>('ideation')

  // Step 3: Founder Preferences
  const [displayName, setDisplayName] = useState(initialName)
  const [technicalLevel, setTechnicalLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [weeklyHoursAvailable, setWeeklyHoursAvailable] = useState(20)
  const [communicationTone, setCommunicationTone] = useState<'casual' | 'direct' | 'formal'>('direct')
  const [preferredAgentSpeed, setPreferredAgentSpeed] = useState<'fast' | 'thorough'>('thorough')
  const [primaryGoal, setPrimaryGoal] = useState('')

  // Step 4: AI Personalization Roadmap
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [completing, setCompleting] = useState(false)
  const [completeLogs, setCompleteLogs] = useState<string[]>([])

  // Typewriter effect for AI introduction
  const [welcomeText, setWelcomeText] = useState('')
  const fullWelcome = `Hello, ${initialName}. I am your AI Co-Founder. Let's build your startup together. First, tell me what you want to build or what pain point you want to solve.`

  useEffect(() => {
    let index = 0
    const interval = setInterval(() => {
      setWelcomeText((prev) => prev + fullWelcome.charAt(index))
      index++
      if (index >= fullWelcome.length) {
        clearInterval(interval)
      }
    }, 25)
    return () => clearInterval(interval)
  }, [])

  // Handle AI analysis step
  const handleAnalyzeIdea = async () => {
    if (!description.trim()) return
    setAnalyzing(true)
    setAnalysisLogs([])

    const logs = [
      'Initializing connection to AI Co-Founder network...',
      'Analyzing startup domain pain point structures...',
      'Querying Google Gemini 2.5 context filters...',
      'Formulating target customer segments & market verticals...',
      'Synthesizing MVP features and 90-day epic plan...',
      'Crystallizing launch milestone metrics...'
    ]

    // Simulate logs running
    let logIdx = 0
    const logInterval = setInterval(() => {
      if (logIdx < logs.length) {
        setAnalysisLogs((prev) => [...prev, logs[logIdx]])
        logIdx++
      } else {
        clearInterval(logInterval)
      }
    }, 600)

    try {
      const res = await fetch('/api/onboarding/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, fullName: displayName })
      })

      if (!res.ok) throw new Error('Analysis failed')

      const data = await res.json()
      setStartupName(data.startupName)
      setTagline(data.tagline)
      setIndustry(data.industry)
      setTargetAudience(data.targetAudience)
      setStage(data.stage || 'ideation')
      setRoadmap(data.roadmap)

      // Auto-set primary goal based on tagline
      setPrimaryGoal(`Launch ${data.startupName}: ${data.tagline}`)

      setTimeout(() => {
        clearInterval(logInterval)
        setStep(2)
        setAnalyzing(false)
      }, 3800)

    } catch (err) {
      console.error('Error during AI analysis:', err)
      setAnalyzing(false)
      clearInterval(logInterval)
      alert('Failed to analyze idea. Please try again.')
    }
  }

  // Handle onboarding completion save
  const handleCompleteOnboarding = async () => {
    setCompleting(true)
    setCompleteLogs([])

    const launchLogs = [
      'Saving personalized builder configuration...',
      'Wiring up primary database tables...',
      'Provisioning initial 90-day roadmap schemas...',
      'Spawning autonomous execution agents...',
      'Initializing War Room weekly sprints...',
      'Launching workspace console...'
    ]

    let logIdx = 0
    const logInterval = setInterval(() => {
      if (logIdx < launchLogs.length) {
        setCompleteLogs((prev) => [...prev, launchLogs[logIdx]])
        logIdx++
      } else {
        clearInterval(logInterval)
      }
    }, 500)

    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          technicalLevel,
          weeklyHoursAvailable,
          communicationTone,
          preferredAgentSpeed,
          primaryGoal,
          startupName,
          tagline,
          description,
          industry,
          targetAudience,
          stage,
          roadmap
        })
      })

      if (!res.ok) throw new Error('Save failed')

      setTimeout(() => {
        clearInterval(logInterval)
        router.push('/dashboard')
        router.refresh()
      }, 3200)

    } catch (err) {
      console.error('Error saving onboarding data:', err)
      setCompleting(false)
      clearInterval(logInterval)
      alert('Failed to save settings. Please try again.')
    }
  }

  // Live Agent response preview generator based on tone choice
  const getAgentTonePreview = () => {
    switch (communicationTone) {
      case 'casual':
        return `Hey ${displayName}! I've ran the outline and it looks super solid. Let's crush this week and ship the database model. Ready when you are! 🚀`
      case 'formal':
        return `Good day, Founder. I have compiled the database schemas and verified the RLS logic. Please review the proposal at your convenience so we may proceed.`
      case 'direct':
      default:
        return `Database schema complete. RLS active. Standing by to generate migrations.`
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-12 md:py-20 flex flex-col min-h-screen justify-between relative z-10">
      
      {/* Header & Steps Indicator */}
      <header className="flex flex-col items-center gap-4 text-center">
        <span className="font-display font-extrabold text-2xl tracking-tighter bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
          Karnex AI Co-Founder
        </span>
        
        {/* Progress Bar */}
        <div className="flex items-center justify-between w-full max-w-md mt-6 relative px-2">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#1a1a1a] -translate-y-1/2 z-0" />
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 -translate-y-1/2 transition-all duration-500 z-0" 
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />
          
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s}
              onClick={() => {
                // Prevent navigating forward to steps we don't have data for yet
                if (s < step || (s === 2 && startupName) || (s === 3 && startupName)) {
                  setStep(s)
                }
              }}
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-mono font-bold transition-all duration-300 cursor-pointer ${
                s <= step 
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 ring-4 ring-indigo-500/10' 
                  : 'bg-[#0c0c0c] border border-[#1a1a1a] text-[#525252]'
              }`}
            >
              {s}
            </div>
          ))}
        </div>
      </header>

      {/* Steps Container */}
      <main className="flex-1 flex items-center justify-center my-12">
        <div className="w-full">
          
          {/* STEP 1: AI Co-Founder Chat */}
          {step === 1 && (
            <div className="w-full max-w-xl mx-auto space-y-8 animate-reveal">
              {/* Typewriter message */}
              <div className="rounded-2xl border border-[#1a1a1a] bg-[#0c0c0c]/80 backdrop-blur p-6 relative">
                <div className="absolute -top-3 left-6 rounded-md bg-[#1a1a1a] px-2.5 py-1 text-[10px] font-mono font-semibold text-indigo-400 uppercase">
                  AI Co-Founder
                </div>
                <p className="font-display font-medium text-lg leading-relaxed text-zinc-100 min-h-[4rem]">
                  {welcomeText}
                  <span className="inline-block w-1.5 h-4 bg-indigo-500 animate-pulse ml-0.5" />
                </p>
              </div>

              {analyzing ? (
                /* Analysis Progress Logs */
                <div className="rounded-2xl border border-indigo-500/10 bg-[#07070f]/90 backdrop-blur p-6 space-y-4 shadow-xl shadow-indigo-500/[0.02]">
                  <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
                    <span className="text-xs font-mono font-semibold text-indigo-400 animate-pulse">
                      EXTRACTING SYSTEM VARIABLES...
                    </span>
                    <svg className="h-4 w-4 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                    </svg>
                  </div>
                  <div className="font-mono text-xs space-y-2 text-zinc-400">
                    {analysisLogs.map((log, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-emerald-500 select-none">✔</span>
                        <span>{log}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-indigo-400 animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      <span>Synthesizing...</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Idea Input Form */
                <div className="space-y-4">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. A developer tooling API that automatically scans and generates supabase RLS migrations based on Typescript model files..."
                    rows={4}
                    className="w-full rounded-xl border border-[#1a1a1a] bg-[#0c0c0c] p-5 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-indigo-500/30 focus:ring-1 focus:ring-indigo-500/20"
                  />
                  
                  <button
                    onClick={handleAnalyzeIdea}
                    disabled={!description.trim()}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-sm py-4 rounded-xl transition-all shadow-md shadow-indigo-500/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Analyze Idea with AI &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Refine Startup Details */}
          {step === 2 && (
            <div className="w-full max-w-xl mx-auto space-y-8 animate-reveal">
              <div className="text-center space-y-2">
                <h2 className="font-display font-bold text-2xl text-white">Refine Startup Profile</h2>
                <p className="text-sm text-zinc-500">I have extracted these details from your concept. Refine them if needed.</p>
              </div>

              <div className="rounded-2xl border border-[#1a1a1a] bg-[#0c0c0c]/85 p-6 md:p-8 space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Startup Name</label>
                  <input
                    type="text"
                    value={startupName}
                    onChange={(e) => setStartupName(e.target.value)}
                    className="w-full rounded-lg border border-[#1a1a1a] bg-[#050505] px-4 py-3 text-sm text-white focus:border-indigo-500/30 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Tagline</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full rounded-lg border border-[#1a1a1a] bg-[#050505] px-4 py-3 text-sm text-white focus:border-indigo-500/30 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Industry</label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full rounded-lg border border-[#1a1a1a] bg-[#050505] px-4 py-3 text-sm text-white focus:border-indigo-500/30 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Startup Stage</label>
                    <select
                      value={stage}
                      onChange={(e) => setStage(e.target.value as any)}
                      className="w-full rounded-lg border border-[#1a1a1a] bg-[#050505] px-4 py-3 text-sm text-white focus:border-indigo-500/30 focus:outline-none cursor-pointer"
                    >
                      <option value="ideation">Ideation</option>
                      <option value="validation">Validation</option>
                      <option value="building">Building</option>
                      <option value="launching">Launching</option>
                      <option value="growing">Growing</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Target Audience</label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full rounded-lg border border-[#1a1a1a] bg-[#050505] px-4 py-3 text-sm text-white focus:border-indigo-500/30 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-between gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="bg-transparent hover:bg-zinc-900 border border-[#1a1a1a] text-zinc-400 font-medium text-sm px-6 py-3.5 rounded-xl transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-sm px-8 py-3.5 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-500/10"
                >
                  Next Step &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Founder Preferences */}
          {step === 3 && (
            <div className="w-full max-w-2xl mx-auto space-y-8 animate-reveal">
              <div className="text-center space-y-2">
                <h2 className="font-display font-bold text-2xl text-white">Founder Preferences</h2>
                <p className="text-sm text-zinc-500">Configure how we will collaborate to build this startup.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Prefs: Sliders & Text */}
                <div className="rounded-2xl border border-[#1a1a1a] bg-[#0c0c0c]/85 p-6 space-y-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Your Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full rounded-lg border border-[#1a1a1a] bg-[#050505] px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Weekly Hours Available</label>
                      <span className="text-xs font-mono font-semibold text-indigo-400">{weeklyHoursAvailable} hours</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="80"
                      value={weeklyHoursAvailable}
                      onChange={(e) => setWeeklyHoursAvailable(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Technical Level</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['beginner', 'intermediate', 'advanced'].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setTechnicalLevel(lvl as any)}
                          className={`border text-[11px] font-semibold py-2.5 rounded-lg capitalize transition-all cursor-pointer ${
                            technicalLevel === lvl 
                              ? 'border-indigo-500 bg-indigo-500/10 text-white' 
                              : 'border-[#1a1a1a] bg-[#050505] text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-2">
                      {technicalLevel === 'beginner' && 'AI will generate step-by-step guides and template blocks.'}
                      {technicalLevel === 'intermediate' && 'AI will generate solid framework skeletons and blueprints.'}
                      {technicalLevel === 'advanced' && 'AI will output direct database schemas, migrations, and clean code diffs.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">AI Agent Verification Level</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'fast', label: 'Fast Speed', desc: 'Accelerated execution feedback loops.' },
                        { key: 'thorough', label: 'Thorough Execution', desc: 'Deeper computations & double-checking.' }
                      ].map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => setPreferredAgentSpeed(s.key as any)}
                          className={`border text-left p-3 rounded-lg transition-all cursor-pointer ${
                            preferredAgentSpeed === s.key 
                              ? 'border-indigo-500 bg-indigo-500/10 text-white' 
                              : 'border-[#1a1a1a] bg-[#050505] text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          <div className="text-[11px] font-semibold">{s.label}</div>
                          <div className="text-[9px] text-zinc-500 mt-0.5">{s.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Prefs: Communication Tone & Interactive Preview */}
                <div className="flex flex-col justify-between gap-6">
                  
                  {/* Tone Options */}
                  <div className="rounded-2xl border border-[#1a1a1a] bg-[#0c0c0c]/85 p-6 space-y-4">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Communication Tone</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['casual', 'direct', 'formal'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setCommunicationTone(t as any)}
                          className={`border text-[11px] font-semibold py-2.5 rounded-lg capitalize transition-all cursor-pointer ${
                            communicationTone === t 
                              ? 'border-indigo-500 bg-indigo-500/10 text-white' 
                              : 'border-[#1a1a1a] bg-[#050505] text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Agent Preview */}
                  <div className="flex-1 rounded-2xl border border-[#1a1a1a] bg-[#0c0c0c]/50 p-6 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all" />
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">Live Agent Interface Preview</span>
                      </div>
                      <p className="font-mono text-xs text-indigo-400 italic">
                        &ldquo;{getAgentTonePreview()}&rdquo;
                      </p>
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-4 leading-relaxed font-sans">
                      *AI agent tone is configured automatically across task generation modules and dashboard coaching standups.
                    </div>
                  </div>

                  {/* Primary Goal */}
                  <div className="rounded-2xl border border-[#1a1a1a] bg-[#0c0c0c]/85 p-6">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Primary Goal</label>
                    <input
                      type="text"
                      value={primaryGoal}
                      onChange={(e) => setPrimaryGoal(e.target.value)}
                      placeholder="e.g. Build interactive product prototype"
                      className="w-full rounded-lg border border-[#1a1a1a] bg-[#050505] px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 focus:outline-none"
                    />
                  </div>

                </div>
              </div>

              <div className="flex justify-between gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="bg-transparent hover:bg-zinc-900 border border-[#1a1a1a] text-zinc-400 font-medium text-sm px-6 py-3.5 rounded-xl transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-sm px-8 py-3.5 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-500/10"
                >
                  Next Step &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: AI Personalization Blueprint & Launch */}
          {step === 4 && (
            <div className="w-full max-w-3xl mx-auto space-y-8 animate-reveal">
              {completing ? (
                /* Launch Loader */
                <div className="max-w-xl mx-auto rounded-2xl border border-indigo-500/10 bg-[#07070f]/90 backdrop-blur p-8 space-y-6 shadow-xl shadow-indigo-500/[0.04] text-center">
                  <div className="flex flex-col items-center gap-4 border-b border-[#1a1a1a] pb-6">
                    <svg className="h-10 w-10 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                    </svg>
                    <h3 className="font-display font-bold text-xl text-white">
                      INITIALIZING PERSONAL WORKSPACE...
                    </h3>
                  </div>
                  <div className="font-mono text-xs space-y-2.5 text-left max-w-sm mx-auto text-zinc-400">
                    {completeLogs.map((log, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-emerald-500 select-none">✔</span>
                        <span>{log}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-3 text-indigo-400 animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      <span>Executing standup nodes...</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Blueprint Overview */
                <div className="space-y-8">
                  <div className="text-center space-y-2">
                    <h2 className="font-display font-bold text-2xl text-white">Personalization Blueprint</h2>
                    <p className="text-sm text-zinc-500">Review your startup blueprint and generate the custom 90-day plan.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Setup Config Cards */}
                    <div className="md:col-span-1 rounded-2xl border border-[#1a1a1a] bg-[#0c0c0c]/85 p-6 space-y-6">
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">Workspace Settings</h3>
                      
                      <div className="space-y-4 font-sans text-xs">
                        <div>
                          <span className="text-zinc-500 block">Founder Profile</span>
                          <span className="font-semibold text-white mt-0.5 block">{displayName}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Startup Target</span>
                          <span className="font-semibold text-white mt-0.5 block">{startupName}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Assigned Stage</span>
                          <span className="font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded px-1.5 py-0.5 inline-block text-[10px] uppercase font-bold mt-1">
                            {stage}
                          </span>
                        </div>
                        <div className="border-t border-[#1a1a1a] pt-4 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Weekly Commitment:</span>
                            <span className="text-zinc-300 font-mono">{weeklyHoursAvailable} hrs</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Technical Depth:</span>
                            <span className="text-zinc-300 capitalize">{technicalLevel}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Colleague Tone:</span>
                            <span className="text-zinc-300 capitalize">{communicationTone}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Verification Level:</span>
                            <span className="text-zinc-300 capitalize">{preferredAgentSpeed}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Roadmap Timeline Card */}
                    <div className="md:col-span-2 rounded-2xl border border-[#1a1a1a] bg-[#0c0c0c]/85 p-6 space-y-6">
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">Custom 90-Day Roadmap</h3>

                      {roadmap ? (
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                          {roadmap.phases.map((phase) => (
                            <div key={phase.phase_number} className="border-b border-[#1a1a1a]/50 last:border-0 pb-4 last:pb-0">
                              <h4 className="text-xs font-semibold text-zinc-200">
                                Phase {phase.phase_number}: {phase.title}
                              </h4>
                              <p className="text-[10px] text-zinc-500 mt-0.5 mb-2 leading-relaxed">
                                {phase.theme}
                              </p>
                              {phase.weekly_goals && (
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  {phase.weekly_goals.map((g) => (
                                    <div key={g.week_number} className="bg-[#050505] rounded border border-[#1d1d1f] p-2 text-[10px]">
                                      <span className="text-indigo-400 font-semibold font-mono">W{g.week_number}: {g.focus}</span>
                                      <ul className="text-zinc-400 mt-1 space-y-0.5 list-disc pl-3">
                                        {g.goals.slice(0, 2).map((goal, idx) => (
                                          <li key={idx} className="truncate">{goal}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-zinc-600 text-xs font-mono">
                          No custom roadmap loaded.
                        </div>
                      )}
                    </div>

                  </div>

                  <div className="flex justify-between gap-4">
                    <button
                      onClick={() => setStep(3)}
                      className="bg-transparent hover:bg-zinc-900 border border-[#1a1a1a] text-zinc-400 font-medium text-sm px-6 py-3.5 rounded-xl transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCompleteOnboarding}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-sm px-8 py-3.5 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-500/10 flex items-center gap-2"
                    >
                      Launch Workspace &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[10px] text-zinc-600 font-mono uppercase tracking-wider">
        Karnex Engine &bull; Version 2026.06.01
      </footer>

    </div>
  )
}
