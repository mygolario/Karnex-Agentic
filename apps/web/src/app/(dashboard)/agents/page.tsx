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
  
  const [agentsList, setAgentsList] = useState<AgentHubRecord[]>([
    {
      name: 'Outreach Agent',
      role: 'Lead Generation & Pitch Sequences',
      description: 'Deploys customized email and LinkedIn outbound flows to find beta customers.',
      status: 'idle',
      tasksCount: 0,
      agentId: 'outreach-v1',
      href: '/agents/outreach',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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

      // 1. Fetch runs for stats calculation
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAgentStats()
  }, [loadAgentStats])

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            Agent Hub
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Orchestrate specialized AI agents to execute product building, market research, content marketing, and outbound outreach.
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-5">
          <p className="text-[10px] font-semibold text-zinc-500 font-mono tracking-wider uppercase">Active Workforce</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-28" />
          ) : (
            <p className="mt-2 text-2xl font-bold text-white">{stats.activeWorkforce} Active</p>
          )}
        </div>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-5">
          <p className="text-[10px] font-semibold text-zinc-500 font-mono tracking-wider uppercase">Tasks Completed</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-28" />
          ) : (
            <p className="mt-2 text-2xl font-bold text-white">{stats.tasksCompleted} Tasks</p>
          )}
        </div>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-5">
          <p className="text-[10px] font-semibold text-zinc-500 font-mono tracking-wider uppercase">Success Rate</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-28" />
          ) : (
            <p className="mt-2 text-2xl font-bold text-emerald-400">{stats.successRate}</p>
          )}
        </div>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-5">
          <p className="text-[10px] font-semibold text-zinc-500 font-mono tracking-wider uppercase">Average Runtime</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-28" />
          ) : (
            <p className="mt-2 text-2xl font-bold text-white">{stats.avgRuntime} / task</p>
          )}
        </div>
      </div>

      {/* Agents Grid */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-mono">
          Specialized Agents Directory
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agentsList.map((agent) => (
            <div key={agent.name} className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-6 flex flex-col justify-between hover:border-zinc-700 transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      {agent.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-200">{agent.name}</h3>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{agent.role}</p>
                    </div>
                  </div>
                  
                  {agent.status === 'running' ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20 font-mono">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      RUNNING
                    </span>
                  ) : agent.status === 'standby' ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20 font-mono">
                      STANDBY
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-500 font-mono">
                      IDLE
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  {agent.description}
                </p>
              </div>

              <div className="border-t border-[#1a1a1a]/60 mt-6 pt-4 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-mono">
                  {agent.tasksCount} total tasks run
                </span>
                
                {agent.name === 'Outreach Agent' ? (
                  <Link
                    href={agent.href}
                    className="rounded-md bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-all shadow-md shadow-indigo-500/10"
                  >
                    Open Dashboard
                  </Link>
                ) : (
                  <span className="text-[10px] text-zinc-600 font-mono font-semibold">
                    Configured via Workspace
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
