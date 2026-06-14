'use client'

import React, { useState, useEffect } from 'react'
import { Cpu, Search, Send, FileText, DollarSign, Brain, Terminal, Activity } from 'lucide-react'

interface Agent {
  id: string
  name: string
  role: string
  status: 'active' | 'standby' | 'idle'
  color: string
  bgColor: string
  description: string
  currentTask?: string
  cpu: number
  mem: number
  threads: number
  icon: React.ReactNode
}

export default function AgentRoster() {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null)
  const [telemetry, setTelemetry] = useState<Record<string, { cpu: number; mem: number; thread: number }>>({})

  const initialAgents: Agent[] = [
    {
      id: 'builder',
      name: 'Builder Agent',
      role: 'CTO / Product Engineering',
      status: 'active',
      color: '#6366f1',
      bgColor: 'rgba(99, 102, 241, 0.03)',
      description: 'Scaffolds Next.js layouts, designs Supabase schemas, and deploys builds to Vercel/Railway.',
      currentTask: 'npm run build: compiling invoicing UI module...',
      cpu: 18,
      mem: 1.4,
      threads: 4,
      icon: <Cpu className="w-4 h-4 text-indigo-400" />
    },
    {
      id: 'research',
      name: 'Research Agent',
      role: 'Strategy & Competitive Landscape',
      status: 'active',
      color: '#06b6d4',
      bgColor: 'rgba(6, 182, 212, 0.03)',
      description: 'Scans competitors, queries database schemas, synthesizes market trends, and outputs briefs.',
      currentTask: 'GET /competitor-map: mapping 5 billing competitors...',
      cpu: 12,
      mem: 0.9,
      threads: 2,
      icon: <Search className="w-4 h-4 text-cyan-400" />
    },
    {
      id: 'outreach',
      name: 'Outreach Agent',
      role: 'Growth & Outreach Channels',
      status: 'active',
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.03)',
      description: 'Composes personalized cold sequences and handles outreach channels in your founder voice.',
      currentTask: 'SMTP send: dispatching outreach sequence to target designers...',
      cpu: 8,
      mem: 0.6,
      threads: 3,
      icon: <Send className="w-4 h-4 text-emerald-400" />
    },
    {
      id: 'content',
      name: 'Content Agent',
      role: 'Marketing Copy & SEO',
      status: 'standby',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.03)',
      description: 'Generates blog calendars, drafts social copy, maps keyword intent, and builds SEO indexes.',
      currentTask: 'listener: standby for new blogging directives...',
      cpu: 1,
      mem: 0.4,
      threads: 1,
      icon: <FileText className="w-4 h-4 text-amber-400" />
    },
    {
      id: 'finance',
      name: 'Financial Agent',
      role: 'Metrics & Financial Modeling',
      status: 'idle',
      color: '#ec4899',
      bgColor: 'rgba(236, 72, 153, 0.03)',
      description: 'Builds 12-month models, tracks actual spend, calculates CAC/LTV, and simulates pivots.',
      currentTask: 'sleep: idle, waiting for active Stripe integration...',
      cpu: 0,
      mem: 0.2,
      threads: 0,
      icon: <DollarSign className="w-4 h-4 text-pink-400" />
    },
    {
      id: 'coaching',
      name: 'Coaching Agent',
      role: 'Co-Founder Accountability & Strategy',
      status: 'active',
      color: '#a855f7',
      bgColor: 'rgba(168, 85, 247, 0.03)',
      description: 'Provokes Socratic check-ins, calculates momentum scores, challenges founder blockers daily.',
      currentTask: 'cron: analyzing morning standup sentiment logs...',
      cpu: 4,
      mem: 0.5,
      threads: 1,
      icon: <Brain className="w-4 h-4 text-purple-400" />
    }
  ]

  // Simulate real-time metric jitter for high premium fidelity
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedTelemetry: Record<string, { cpu: number; mem: number; thread: number }> = {}
      initialAgents.forEach((agent) => {
        if (agent.status === 'active') {
          const jitterCpu = Math.max(2, Math.min(100, agent.cpu + Math.floor(Math.random() * 9) - 4))
          const jitterMem = Math.max(0.1, parseFloat((agent.mem + (Math.random() * 0.1 - 0.05)).toFixed(2)))
          updatedTelemetry[agent.id] = { cpu: jitterCpu, mem: jitterMem, thread: agent.threads }
        } else if (agent.status === 'standby') {
          updatedTelemetry[agent.id] = { cpu: 1, mem: 0.4, thread: 1 }
        } else {
          updatedTelemetry[agent.id] = { cpu: 0, mem: 0.2, thread: 0 }
        }
      })
      setTelemetry(updatedTelemetry)
    }, 1500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="border border-[#1a1a1f] bg-[#070709] rounded-2xl p-5 shadow-[0_12px_40px_0_rgba(0,0,0,0.5)] flex flex-col h-[520px] justify-between transition-all duration-300">
      
      {/* Header Info */}
      <div className="flex justify-between items-start pb-4 border-b border-[#1a1a1f]/60">
        <div>
          <h3 className="text-[13px] font-bold tracking-[0.06em] uppercase text-zinc-400 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-zinc-500" />
            Agent Workspace Team
          </h3>
          <p className="text-[11px] text-zinc-600 mt-0.5">Active co-founder daemon status & logs</p>
        </div>
        <div className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          SYSTEM OK
        </div>
      </div>

      {/* Roster List */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1.5 forge-scroll">
        {initialAgents.map((agent) => {
          const stats = telemetry[agent.id] || { cpu: agent.cpu, mem: agent.mem, thread: agent.threads }
          const isHovered = hoveredAgent === agent.id
          const isActive = agent.status === 'active'
          const isStandby = agent.status === 'standby'

          return (
            <div
              key={agent.id}
              className="group border border-[#1a1a1f]/50 bg-black/20 hover:bg-zinc-900/15 hover:border-zinc-800/80 rounded-xl p-3 transition-all duration-200 cursor-pointer"
              onMouseEnter={() => setHoveredAgent(agent.id)}
              onMouseLeave={() => setHoveredAgent(null)}
            >
              {/* Agent Ident */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors duration-300"
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderColor: isHovered ? agent.color : 'rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    {agent.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white truncate leading-tight group-hover:text-zinc-200 transition-colors">
                      {agent.name}
                    </p>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {agent.role}
                    </p>
                  </div>
                </div>

                {/* State Tag */}
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    isActive ? 'bg-emerald-400 animate-pulse' : isStandby ? 'bg-amber-400' : 'bg-zinc-600'
                  }`} />
                  <span className="text-[9px] font-mono font-medium uppercase text-zinc-500">
                    {agent.status}
                  </span>
                </div>
              </div>

              {/* Monospace Telemetry Strip */}
              <div className="mt-2 flex items-center gap-4 text-[10px] font-mono text-zinc-500 bg-black/45 border border-[#1a1a1f]/30 rounded px-2.5 py-1">
                <div className="flex items-center gap-1">
                  <span className="text-zinc-600">CPU</span>
                  <span className={isActive ? 'text-zinc-300 font-bold' : 'text-zinc-600'}>
                    {stats.cpu}%
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-zinc-600">RAM</span>
                  <span className={isActive ? 'text-zinc-300 font-bold' : 'text-zinc-600'}>
                    {stats.mem}GB
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-zinc-600">THREADS</span>
                  <span className={isActive ? 'text-zinc-300 font-bold' : 'text-zinc-600'}>
                    {stats.thread}
                  </span>
                </div>
              </div>

              {/* CLI Command Line (only if active or standby, and shows custom command line) */}
              {agent.currentTask && (
                <div className="mt-2 bg-[#050507] border border-[#1a1a1f] rounded p-2 text-[10px] font-mono text-zinc-400 overflow-hidden text-ellipsis whitespace-nowrap">
                  <span className="text-[#a855f7]/85 mr-1">$</span>
                  {agent.currentTask}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Interactive Detail Panel / Tooltip Area at the bottom */}
      <div className="border-t border-[#1a1a1f]/60 pt-3 mt-1 flex items-center min-h-[48px]">
        {hoveredAgent ? (
          (() => {
            const agent = initialAgents.find((a) => a.id === hoveredAgent)
            if (!agent) return null
            return (
              <div className="w-full flex flex-col gap-0.5 text-[11px] leading-relaxed animate-forge-msg-enter">
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="font-semibold text-white">{agent.name} Details:</span>
                  <span className="text-[10px] font-mono text-zinc-500">ENDPOINT: v1/agents/{agent.id}</span>
                </div>
                <p className="text-zinc-500 leading-normal text-xs">{agent.description}</p>
              </div>
            )
          })()
        ) : (
          <div className="w-full text-center text-[11px] text-zinc-600 italic">
            Inspect an agent card to view its system specifications and access logs.
          </div>
        )}
      </div>
    </div>
  )
}
