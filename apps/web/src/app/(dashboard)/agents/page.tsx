'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/Skeleton'
import { ErrorBoundary } from '@/components/ErrorBoundary'

interface AgentInfo {
  id: string
  name: string
  description: string
  status: 'online' | 'offline' | 'busy'
  health: number
  category: string
  href: string
}

const agentDirectory: AgentInfo[] = [
  {
    id: 'pain-transformer-v1',
    name: 'Pain Transformer',
    description: 'Converts user frustrations and customer complaints into validated product hypotheses with scored market data.',
    status: 'online',
    health: 100,
    category: 'Ideation',
    href: '/ideas',
  },
  {
    id: 'war-room-v1',
    name: 'War Room Architect',
    description: 'Generates comprehensive 90-day roadmaps broken into phases, weekly sprints, and prioritized tasks.',
    status: 'online',
    health: 100,
    category: 'Strategy',
    href: '/warroom',
  },
  {
    id: 'daily-standup-v1',
    name: 'Accountability Coach',
    description: 'Processes daily founder check-ins, identifies blockers, and delivers velocity coaching feedback.',
    status: 'online',
    health: 100,
    category: 'Coaching',
    href: '/compass',
  },
  {
    id: 'builder-v1',
    name: 'Builder Agent',
    description: 'Generates database schemas, code scaffolding, and technical architecture specifications.',
    status: 'online',
    health: 100,
    category: 'Execution',
    href: '/studio',
  },
  {
    id: 'outreach-v1',
    name: 'Outreach Agent',
    description: 'Composes personalized B2B outbound campaigns, cold email sequences, and lead engagement messages.',
    status: 'online',
    health: 100,
    category: 'Growth',
    href: '/agents/outreach',
  },
  {
    id: 'research-v1',
    name: 'Research Agent',
    description: 'Conducts competitive analysis, market research, and industry trend evaluation for strategic decisions.',
    status: 'online',
    health: 100,
    category: 'Intelligence',
    href: '/agents/research',
  },
]

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

  const [totalRuns, setTotalRuns] = useState(0)
  const [activeRuns, setActiveRuns] = useState(0)
  const [successRate, setSuccessRate] = useState(0)
  const [recentRuns, setRecentRuns] = useState<{ agent_id: string; status: string; created_at: string }[]>([])

  const fetchAgentData = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const uid = session.user.id

      // Total runs
      const { count: totalCount } = await supabase
        .from('agent_runs')
        .select('*', { count: 'exact', head: true })
        .eq('founder_id', uid)

      setTotalRuns(totalCount ?? 0)

      // Active runs
      const { count: runningCount } = await supabase
        .from('agent_runs')
        .select('*', { count: 'exact', head: true })
        .eq('founder_id', uid)
        .eq('status', 'running')

      setActiveRuns(runningCount ?? 0)

      // Success rate
      const { count: successCount } = await supabase
        .from('agent_runs')
        .select('*', { count: 'exact', head: true })
        .eq('founder_id', uid)
        .eq('status', 'success')

      const rate = (totalCount && totalCount > 0) ? Math.round(((successCount ?? 0) / totalCount) * 100) : 100
      setSuccessRate(rate)

      // Recent runs
      const { data: recentData } = await supabase
        .from('agent_runs')
        .select('agent_id, status, created_at')
        .eq('founder_id', uid)
        .order('created_at', { ascending: false })
        .limit(8)

      if (recentData) setRecentRuns(recentData)
    } catch (err) {
      console.error('Error loading agent data:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchAgentData()
  }, [fetchAgentData])

  const getStatusColor = (status: string) => {
    if (status === 'online' || status === 'success') return 'bg-emerald-500'
    if (status === 'busy' || status === 'running') return 'bg-[#6366f1]'
    return 'bg-[#525252]'
  }

  const getStatusTextColor = (status: string) => {
    if (status === 'online' || status === 'success') return 'text-emerald-400'
    if (status === 'busy' || status === 'running') return 'text-[#6366f1]'
    if (status === 'failed') return 'text-red-400'
    return 'text-[#525252]'
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-10 pb-16 dash-reveal">
      
      {/* Header */}
      <div className="border-b border-[#1a1a1a] pb-8">
        <p className="section-label mb-3">Execution</p>
        <h1 className="font-display font-bold text-[clamp(28px,3.5vw,36px)] leading-[1.15] tracking-[-0.025em] text-white">
          Agent Hub
        </h1>
        <p className="mt-2 text-[15px] text-[#737373] max-w-[600px]">
          Orchestrate specialized AI agents to research, build, write, and deploy your startup infrastructure.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#1a1a1a] border border-[#1a1a1a] rounded-2xl overflow-hidden">
        {[
          { label: 'Total Runs', value: loading ? '—' : totalRuns.toString() },
          { label: 'Active Now', value: loading ? '—' : activeRuns.toString() },
          { label: 'Success Rate', value: loading ? '—' : `${successRate}%` },
          { label: 'Agents Online', value: agentDirectory.filter(a => a.status === 'online').length.toString() },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#050505] p-6">
            <p className="text-[13px] text-[#525252] mb-2">{stat.label}</p>
            <span className="font-display font-bold text-[28px] tracking-[-0.03em] text-white">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Agent Directory */}
      <div className="space-y-5">
        <p className="section-label">Agent Directory</p>
        <div className="grid md:grid-cols-2 gap-px bg-[#1a1a1a] border border-[#1a1a1a] rounded-2xl overflow-hidden">
          {agentDirectory.map((agent) => (
            <Link
              key={agent.id}
              href={agent.href}
              className="bg-[#050505] p-6 hover:bg-[#0a0a0a] transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full ${getStatusColor(agent.status)}`} />
                  <h3 className="text-[15px] font-semibold text-white">{agent.name}</h3>
                </div>
                <span className="text-[12px] font-medium tracking-[0.06em] uppercase text-[#525252]">
                  {agent.category}
                </span>
              </div>
              
              <p className="text-[14px] text-[#737373] leading-[1.65] mb-4">
                {agent.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-[13px] font-medium capitalize ${getStatusTextColor(agent.status)}`}>
                    {agent.status}
                  </span>
                </div>
                <span className="text-[13px] text-[#525252] group-hover:text-[#6366f1] transition-colors">
                  Open →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Runs */}
      <div className="space-y-5">
        <p className="section-label">Recent Agent Runs</p>
        <div className="border border-[#1a1a1a] rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-6 w-full rounded-lg" />
              <Skeleton className="h-6 w-full rounded-lg" />
              <Skeleton className="h-6 w-full rounded-lg" />
            </div>
          ) : recentRuns.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#1a1a1a] text-[12px] font-medium tracking-[0.06em] uppercase text-[#525252]">
                  <th className="px-6 py-4">Agent</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run, idx) => {
                  const name = run.agent_id.replace('-v1', '').replace(/-/g, ' ')
                  const diffMs = new Date().getTime() - new Date(run.created_at).getTime()
                  const diffMin = Math.floor(diffMs / 60000)
                  let timeStr = 'Just now'
                  if (diffMin >= 1440) timeStr = `${Math.floor(diffMin / 1440)}d ago`
                  else if (diffMin >= 60) timeStr = `${Math.floor(diffMin / 60)}h ago`
                  else if (diffMin > 0) timeStr = `${diffMin}m ago`

                  return (
                    <tr key={idx} className="border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#0a0a0a] transition-colors">
                      <td className="px-6 py-4 text-[14px] font-medium text-[#e5e5e5] capitalize">{name}</td>
                      <td className="px-6 py-4 text-[14px] text-[#525252]">{timeStr}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`dash-badge ${
                          run.status === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                          run.status === 'running' ? 'bg-[#6366f1]/10 border-[#6366f1]/20 text-[#6366f1]' :
                          run.status === 'failed' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                          'bg-[#1a1a1a] border-[#262626] text-[#525252]'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${getStatusColor(run.status)}`} />
                          {run.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-16 text-center">
              <p className="text-[15px] text-[#525252]">No agent runs recorded yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
