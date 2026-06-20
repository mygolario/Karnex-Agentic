'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/hooks/useOnboardingStore'
import { Clock, CheckCircle2, Circle, AlertCircle, Sparkles, Layout, Compass, Shield, ArrowRight, ArrowLeft, Play, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PreviewProps {
  onPrev: () => void
  onUpdateWhy: (title: string, content: string) => void
}

export default function DashboardPreview({ onPrev, onUpdateWhy }: PreviewProps) {
  const { profile, saveProgressToDb } = useOnboardingStore()
  const router = useRouter()

  const [launching, setLaunching] = useState(false)
  const [launchLogs, setLaunchLogs] = useState<string[]>([])

  const displayName = profile.identity?.displayName || 'Founder'
  const startupName = profile.venture?.productName || profile.venture?.domain || 'Your Venture'
  const weeklyHrs = profile.execution?.weeklyAvailability || '5-15 hrs'
  const cycle = profile.execution?.cyclePosition || 'pre-validation'
  const bottleneck = profile.execution?.bottleneck || 'unclear-idea'
  const tools = profile.execution?.tools || []
  const samples = profile.voice?.writingSamples || []

  useEffect(() => {
    onUpdateWhy(
      'Live Workspace Preview',
      'This is a real preview of your Journey HQ dashboard generated using your Founder Profile. Karnex has already pre-configured your weekly sprints, prioritized bottlenecks, and prepared active agent models.'
    )
  }, [])

  const handleLaunch = async () => {
    setLaunching(true)
    setLaunchLogs(['Consolidating Founder Profile schema...', 'Writing memory namespace profile.founder_profile...', 'Triggering Dream Engine pre-generation...'])

    try {
      // 1. Save progress first
      await saveProgressToDb()

      // 2. Trigger completion endpoint
      setLaunchLogs((prev) => [...prev, 'Spawning Architect 90-Day War Room...', 'Generating Sprint Week 1 task cards...', 'Scheduling Daily Standup for next morning...'])
      
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          technicalLevel: profile.identity?.technicalLevel,
          weeklyHoursAvailable: profile.execution?.weeklyAvailability === '<5 hrs' ? 5 : profile.execution?.weeklyAvailability === '5-15 hrs' ? 10 : 20,
          communicationTone: profile.identity?.feedbackStyle === 'gentle' ? 'casual' : profile.identity?.feedbackStyle === 'brutal' ? 'direct' : 'direct',
          preferredAgentSpeed: 'thorough',
          startupName,
          tagline: profile.venture?.idea ? profile.venture.idea.split('.')[0] : 'Innovating the market',
          description: profile.venture?.idea || 'No idea specified',
          industry: profile.venture?.domain || 'SaaS',
          targetAudience: profile.market?.targetCustomer?.jobTitle || 'General Audience',
          stage: profile.venture?.stage || 'ideation',
          profileData: profile // send full profile data to consolidate
        })
      })

      if (!response.ok) throw new Error('Onboarding completion failed')

      setLaunchLogs((prev) => [...prev, 'Workspace fully provisioned! Directing to Mission Control...'])

      // Short delay for visual effect
      setTimeout(() => {
        router.push('/home')
      }, 1500)

    } catch (err) {
      console.error(err)
      setLaunchLogs((prev) => [...prev, 'Error: Workspace provisioning failed. Please try again.'])
      setLaunching(false)
    }
  }

  const getCoachingInsight = () => {
    const feedback = profile.identity?.feedbackStyle
    if (feedback === 'brutal') {
      return `Welcome to the arena, ${displayName}. Your 90-day sprint is locked. You identified '${bottleneck}' as your bottleneck. Zero excuses — let's tackle this.`
    }
    if (feedback === 'gentle') {
      return `Great job completing your configuration, ${displayName}! We have mapped out your week to fit your availability. Let's take the first step together.`
    }
    return `Profile initialized, ${displayName}. Sprints are structured around ${weeklyHrs}/week. Let's focus on clearing your bottleneck: ${bottleneck}.`
  }

  return (
    <div className="w-full space-y-6 animate-reveal">
      <div className="text-center space-y-1">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1a1a1a] bg-[#050505] px-3.5 py-0.5 text-[10px] font-mono font-semibold text-[#6366f1] tracking-wider uppercase">
          <Sparkles className="w-3 h-3" />
          Final // Workspace Ready
        </span>
        <h2 className="font-display font-bold text-2xl md:text-3xl text-white tracking-tight">
          Welcome to Karnex, {displayName}.
        </h2>
        <p className="text-xs text-[#a1a1a1]">
          Your personalized workspace has been pre-configured and is ready for launch.
        </p>
      </div>

      {/* Main Preview Container */}
      <div className="border border-[#1a1a1a] bg-[#09090b]/40 backdrop-blur-xl rounded-2xl p-5 md:p-6 space-y-5 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient(circle at 100% 100%, rgba(99, 102, 241, 0.03), transparent 60%) pointer-events-none" />

        {/* Dashboard Header Mockup */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1a1a1f] pb-4">
          <div>
            <span className="text-[10px] font-mono text-[#525252] uppercase tracking-wider block">MISSION CONTROL // HQ</span>
            <h3 className="font-display font-bold text-lg text-white mt-0.5">
              Good morning, {displayName}.
            </h3>
            <p className="text-[11px] text-zinc-500">
              Active Startup: <span className="text-white font-medium">{startupName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#050505]/80 border border-[#1a1a1f] rounded-lg px-3 py-1.5 text-[10px] font-mono">
            <Clock className="w-3 h-3 text-indigo-400" />
            <span className="text-zinc-400">DAY <span className="text-white font-bold">1</span> OF 90</span>
            <span className="text-zinc-600">|</span>
            <span className="text-indigo-400 font-bold">0% COMPLETE</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left Side: Tasks & Standup */}
          <div className="md:col-span-8 space-y-4">
            {/* Morning Standup Mockup */}
            <div className="bg-[#050505]/40 border border-[#1a1a1f] rounded-xl p-4 space-y-2">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">DAILY ACCOUNTABILITY</span>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white font-medium">Daily Standup Check-in</span>
                <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">Pending</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-normal">
                Your first check-in will trigger tomorrow morning to review your daily must-wins and clear bottlenecks.
              </p>
            </div>

            {/* Sprints Tasks Mockup */}
            <div className="bg-[#050505]/40 border border-[#1a1a1f] rounded-xl p-4 space-y-3">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">SPRINT WEEK 1 // INITIATED</span>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-[#0c0c0f]/40 border border-[#1a1a1f] rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="h-5 w-5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <div>
                      <span className="text-xs text-white font-medium block">Pre-generate Idea Crystallizer memo</span>
                      <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">Dream Engine Agent (1.2) // Context Ready</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Complete</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-[#0c0c0f]/40 border border-[#1a1a1f] rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="h-5 w-5 rounded border border-[#1a1a1f] bg-[#050505] flex items-center justify-center text-transparent">
                      <Circle className="w-2.5 h-2.5" />
                    </div>
                    <div>
                      <span className="text-xs text-white font-medium block">Map Competitors & Positioning Advantage</span>
                      <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">Competitive Landscape Agent (1.4) // Awaiting Launch</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 bg-[#1a1a1a] px-2 py-0.5 rounded-full">Queued</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-[#0c0c0f]/40 border border-[#1a1a1f] rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="h-5 w-5 rounded border border-[#1a1a1f] bg-[#050505] flex items-center justify-center text-transparent">
                      <Circle className="w-2.5 h-2.5" />
                    </div>
                    <div>
                      <span className="text-xs text-white font-medium block">Calibrate outreach voice model</span>
                      <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">Outreach Agent (3.3) // Past samples parsed</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 bg-[#1a1a1a] px-2 py-0.5 rounded-full">Queued</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Roster & Mirror Agent */}
          <div className="md:col-span-4 space-y-4">
            {/* Mirror Agent Coaching Mockup */}
            <div className="bg-[#0c0c0f]/40 border border-[#1a1a1f] rounded-xl p-4 space-y-2.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-16 w-16 bg-[#6366f1]/05 rounded-full blur-xl pointer-events-none" />
              <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest block flex items-center gap-1">
                <Compass className="w-3 h-3 text-indigo-400 animate-spin" />
                Mirror Agent 4.5 // Online
              </span>
              <p className="text-[11px] text-zinc-300 leading-relaxed italic">
                &ldquo;{getCoachingInsight()}&rdquo;
              </p>
            </div>

            {/* Active Agents Queued List */}
            <div className="bg-[#050505]/40 border border-[#1a1a1f] rounded-xl p-4 space-y-2.5">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">ACTIVE AGENTS QUEUED</span>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400">
                <div className="flex items-center gap-1.5 py-1 px-2 border border-[#1a1a1f] bg-[#0c0c0f]/20 rounded-lg">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Dream Engine</span>
                </div>
                <div className="flex items-center gap-1.5 py-1 px-2 border border-[#1a1a1f] bg-[#0c0c0f]/20 rounded-lg">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Architect</span>
                </div>
                <div className="flex items-center gap-1.5 py-1 px-2 border border-[#1a1a1f] bg-[#0c0c0f]/20 rounded-lg">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Sprint Planner</span>
                </div>
                <div className="flex items-center gap-1.5 py-1 px-2 border border-[#1a1a1f] bg-[#0c0c0f]/20 rounded-lg">
                  {samples.length > 0 ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                  )}
                  <span>Outreach</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel for Provisioning */}
        {launching && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 border border-[#1a1a1a] rounded-xl bg-[#050505]/80 space-y-2 font-mono text-[10px] text-[#737373] max-w-2xl mx-auto"
          >
            {launchLogs.map((log, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {idx === launchLogs.length - 1 ? (
                  <Loader2 className="w-3.5 h-3.5 text-[#6366f1] animate-spin" />
                ) : (
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                )}
                <span className={idx === launchLogs.length - 1 ? 'text-white' : ''}>{log}</span>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="pt-6 border-t border-[#1a1a1a] flex justify-between items-center">
        <button
          onClick={onPrev}
          disabled={launching}
          className="px-4 py-2 border border-[#1a1a1a] hover:border-[#2a2a2a] text-[#737373] hover:text-white rounded-lg text-xs font-medium font-mono flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          BACK
        </button>

        <button
          onClick={handleLaunch}
          disabled={launching}
          className="px-6 py-3 bg-[#6366f1] hover:bg-[#5558e6] disabled:opacity-40 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-[#6366f1]/20 cursor-pointer"
        >
          {launching ? (
            <>
              PROVISIONING WORKSPACE...
            </>
          ) : (
            <>
              LAUNCH WORKSPACE
              <Play className="w-3.5 h-3.5 fill-current" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
