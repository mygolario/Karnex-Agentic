'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/Skeleton'
import { ErrorBoundary } from '@/components/ErrorBoundary'

interface AgentHubRecord {
  name: string
  role: string
  description: string
  status: 'idle' | 'running' | 'standby'
  tasksCount: number
  href: string
  icon: React.ReactNode
  agentId: string
  health: number
  latency: string
  successRate: string
}

export default function AgentsPage() {
  return (
    <ErrorBoundary>
      <AgentsContent />
    </ErrorBoundary>
  )
}

function AgentsContent() {
  const supabase = createSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    activeWorkforce: 0,
    tasksCompleted: 0,
    successRate: '100%',
    avgRuntime: '0.0m'
  })

  // Simulated live execution latency state just for a premium interactive feel
  const [activeLatencies, setActiveLatencies] = useState<Record<string, string>>({
    'outreach-v1': '0.9s',
    'builder-v1': '1.4s',
    'research-v1': '1.1s',
    'content-v1': '0.8s',
  })
  
  const [agentsList, setAgentsList] = useState<AgentHubRecord[]>([
    {
      name: 'Outreach Agent',
      role: 'Lead Generation & Pitch Sequences',
      description: 'Deploys customized email and LinkedIn outbound flows to find beta customers.',
      status: 'idle',
      tasksCount: 0,
      agentId: 'outreach-v1',
      href: '/agents/outreach',
      health: 98,
      latency: '0.9s',
      successRate: '97%',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      ),
    },
    {
      name: 'Builder Agent',
      role: 'Full Stack Scaffolder & Deployment',
      description: 'Generates database models, configures API integrations, and deploys builds to Vercel/Railway.',
      status: 'idle',
      tasksCount: 0,
      agentId: 'builder-v1',
      href: '/agents',
      health: 99,
      latency: '1.4s',
      successRate: '98%',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      ),
    },
    {
      name: 'Research Agent',
      role: 'Competitive Landscape & Pricing Benchmarks',
      description: 'Runs market analysis and compiles gap tables comparing current competitors.',
      status: 'idle',
      tasksCount: 0,
      agentId: 'research-v1',
      href: '/agents',
      health: 96,
      latency: '1.1s',
      successRate: '95%',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
        </svg>
      ),
    },
    {
      name: 'Content & SEO Agent',
      role: 'Editorial Marketing Copy & SEO',
      description: 'Generates programmatic SEO calendars, blog content, and landing page scripts.',
      status: 'idle',
      tasksCount: 0,
      agentId: 'content-v1',
      href: '/agents',
      health: 97,
      latency: '0.8s',
      successRate: '96%',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
        </svg>
      ),
    },
  ])

  const loadAgentStats = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Fetch runs for stats calculation
      const { data: runs } = await supabase
        .from('agent_runs')
        .select('agent_id, status, duration_ms')
        .eq('founder_id', session.user.id)

      if (runs) {
        const activeCount = runs.filter(r => r.status === 'running').length
        const completedCount = runs.filter(r => r.status === 'success').length
        const totalCount = runs.length
        
        // Calculate success rate
        let successPct = '100%'
        if (totalCount > 0) {
          const successCount = runs.filter(r => r.status === 'success').length
          successPct = `${Math.round((successCount / totalCount) * 100)}%`
        }

        // Calculate average duration
        let avgMinStr = '0.0m'
        const completedRuns = runs.filter(r => r.status === 'success' && r.duration_ms)
        if (completedRuns.length > 0) {
          const totalMs = completedRuns.reduce((acc, curr) => acc + (curr.duration_ms || 0), 0)
          const avgMin = totalMs / completedRuns.length / 1000 / 60
          avgMinStr = `${avgMin.toFixed(1)}m`
        }

        setStats({
          activeWorkforce: activeCount,
          tasksCompleted: completedCount,
          successRate: successPct,
          avgRuntime: avgMinStr
        })

        // Map individual run counts and active status to the directory
        setAgentsList(prev => prev.map(agent => {
          const agentRuns = runs.filter(r => r.agent_id.toLowerCase().includes(agent.agentId.toLowerCase()))
          const isRunning = agentRuns.some(r => r.status === 'running')
          return {
            ...agent,
            tasksCount: agentRuns.filter(r => r.status === 'success').length,
            status: isRunning ? 'running' : 'idle'
          }
        }))
      }
    } catch (err) {
      console.error('Error loading agent directory stats:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadAgentStats()
  }, [loadAgentStats])

  // Periodic random update to simulated latencies to make the screen feel "alive"
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveLatencies(prev => {
        const copy = { ...prev }
        Object.keys(copy).forEach(key => {
          const base = parseFloat(copy[key])
          const change = (Math.random() - 0.5) * 0.15
          copy[key] = `${Math.max(0.4, Math.min(2.0, base + change)).toFixed(1)}s`
        })
        return copy
      })
    }, 4500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12 relative">
      <div className="absolute -top-10 left-12 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="border-b border-[#1a1a1a]/40 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white">
            Agent Hub
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Orchestrate specialized AI agents to execute product building, market research, content marketing, and outreach campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-[#1a1a1a]/40 bg-[#060608]/80 px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-zinc-400 font-mono tracking-wider uppercase">
            Workforce Sync: Online
          </span>
        </div>
      </div>

      {/* Overview Stats (Glassmorphic Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-5 relative overflow-hidden group hover:border-indigo-500/20 transition-all">
          <p className="text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase">Active Workforce</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-28 bg-[#18181c]" />
          ) : (
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-white tracking-tight">{stats.activeWorkforce}</span>
              <span className="text-xs text-zinc-500 font-mono font-semibold">Running</span>
            </div>
          )}
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500/0 via-indigo-500/20 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="rounded-xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-5 relative overflow-hidden group hover:border-indigo-500/20 transition-all">
          <p className="text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase">Completed Sequences</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-28 bg-[#18181c]" />
          ) : (
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-white tracking-tight">{stats.tasksCompleted}</span>
              <span className="text-xs text-zinc-500 font-mono font-semibold">Tasks</span>
            </div>
          )}
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500/0 via-violet-500/20 to-violet-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="rounded-xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-5 relative overflow-hidden group hover:border-indigo-500/20 transition-all">
          <p className="text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase">Execution Success</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-28 bg-[#18181c]" />
          ) : (
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-emerald-400 tracking-tight">{stats.successRate}</span>
              <span className="text-xs text-zinc-500 font-mono font-semibold">Target</span>
            </div>
          )}
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="rounded-xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-5 relative overflow-hidden group hover:border-indigo-500/20 transition-all">
          <p className="text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase">Average Latency</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-28 bg-[#18181c]" />
          ) : (
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-white tracking-tight">{stats.avgRuntime}</span>
              <span className="text-xs text-zinc-500 font-mono font-semibold">/ task</span>
            </div>
          )}
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Agents Grid */}
      <div className="space-y-4">
        <h2 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase font-mono">
          Specialized Agents Directory
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agentsList.map((agent) => {
            const currentLatency = activeLatencies[agent.agentId] || agent.latency
            
            return (
              <div 
                key={agent.name} 
                className="rounded-2xl border border-[#1a1a1a]/40 bg-[#07070a]/90 p-6 flex flex-col justify-between hover:border-indigo-500/25 hover:bg-white/[0.01] transition-all duration-300 shadow-inner group relative"
              >
                <div className="space-y-5">
                  
                  {/* Card Header Section */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#050508] border border-zinc-800/60 text-indigo-400 group-hover:border-indigo-500/30 group-hover:bg-indigo-500/5 transition-all">
                        {agent.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">
                          {agent.name}
                        </h3>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{agent.role}</p>
                      </div>
                    </div>
                    
                    {agent.status === 'running' ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/20 font-mono tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        RUNNING
                      </span>
                    ) : agent.status === 'standby' ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[9px] font-bold text-blue-400 border border-blue-500/20 font-mono tracking-wider">
                        STANDBY
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-800/40 px-2.5 py-0.5 text-[9px] font-bold text-zinc-500 font-mono tracking-wider">
                        IDLE
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    {agent.description}
                  </p>

                  {/* Stat Metrics Bars */}
                  <div className="border-t border-zinc-850/40 pt-4 space-y-3">
                    
                    {/* Performance Row 1: System Health */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold font-mono uppercase text-zinc-500">
                        <span>Node Integrity / Health</span>
                        <span className="text-zinc-400">{agent.health}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-zinc-900 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-500" 
                          style={{ width: `${agent.health}%` }}
                        />
                      </div>
                    </div>

                    {/* Performance Row 2: Latency & Success rate */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] font-bold font-mono uppercase text-zinc-500 block">Response Latency</span>
                        <span className="text-[11px] font-mono font-bold text-zinc-300 mt-1 block">
                          {currentLatency}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold font-mono uppercase text-zinc-500 block">Target Accuracy</span>
                        <span className="text-[11px] font-mono font-bold text-emerald-400 mt-1 block">
                          {agent.successRate}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Card Footer Section */}
                <div className="border-t border-[#1a1a1a]/40 mt-6 pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500/60" />
                    <span className="text-[9px] text-zinc-500 font-mono tracking-wider">
                      {agent.tasksCount} SEQUENCE RUNS
                    </span>
                  </div>
                  
                  {agent.name === 'Outreach Agent' ? (
                    <Link
                      href={agent.href}
                      className="rounded-lg bg-indigo-500 hover:bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white transition-all shadow-md shadow-indigo-500/10 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Launch Agent Console
                    </Link>
                  ) : (
                    <span className="text-[9px] text-zinc-600 font-mono font-semibold uppercase tracking-wider bg-zinc-900/60 px-2.5 py-1.5 rounded border border-zinc-850/40">
                      Configured in Workspace
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

