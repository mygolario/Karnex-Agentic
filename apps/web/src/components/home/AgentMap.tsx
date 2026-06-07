'use client'

import React, { useState, useEffect } from 'react'

interface Agent {
  id: string
  name: string
  role: string
  status: 'active' | 'standby' | 'idle'
  x: number
  y: number
  color: string
  glowColor: string
  icon: React.ReactNode
  description: string
  currentTask?: string
}

export default function AgentMap() {
  const [hoveredAgent, setHoveredAgent] = useState<Agent | null>(null)
  const [pulseCenter, setPulseCenter] = useState(false)
  const [activePackets, setActivePackets] = useState<number[]>([1, 2, 3])

  // Periodic visual pulses
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseCenter((prev) => !prev)
      setActivePackets((prev) => prev.map(() => Math.random() * 100))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const agents: Agent[] = [
    {
      id: 'builder',
      name: 'Builder Agent',
      role: 'CTO / Product',
      status: 'active',
      x: 100,
      y: 90,
      color: 'var(--color-mode-build, #6366f1)',
      glowColor: 'rgba(99, 102, 241, 0.4)',
      description: 'Scaffolds Next.js layouts, handles Supabase schemas, and deploys builds to Vercel/Railway.',
      currentTask: 'Compiling invoicing UI module...',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      )
    },
    {
      id: 'research',
      name: 'Research Agent',
      role: 'Strategy / Insights',
      status: 'active',
      x: 500,
      y: 90,
      color: 'var(--color-mode-auto, #06b6d4)',
      glowColor: 'rgba(6, 182, 212, 0.4)',
      description: 'Scans competitors, queries database schemas, synthesizes market trends, and outputs briefs.',
      currentTask: 'Mapping 5 billing competitors...',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
        </svg>
      )
    },
    {
      id: 'outreach',
      name: 'Outreach Agent',
      role: 'Growth / Channels',
      status: 'active',
      x: 100,
      y: 290,
      color: 'var(--color-mode-ask, #0d9488)',
      glowColor: 'rgba(13, 148, 136, 0.4)',
      description: 'Composes personalized cold sequences and handles outreach channels in your founder voice.',
      currentTask: 'Drafting 10 designer emails...',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
      )
    },
    {
      id: 'content',
      name: 'Content Agent',
      role: 'Marketing / Copy',
      status: 'standby',
      x: 500,
      y: 290,
      color: 'var(--color-mode-debug, #f59e0b)',
      glowColor: 'rgba(245, 158, 11, 0.3)',
      description: 'Generates blog calendars, drafts social copy, maps keyword intent, and builds SEO indexes.',
      currentTask: 'Standby for copy instruction...',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )
    },
    {
      id: 'finance',
      name: 'Financial Agent',
      role: 'Metrics / Modeling',
      status: 'idle',
      x: 300,
      y: 50,
      color: '#ec4899',
      glowColor: 'rgba(236, 72, 153, 0.25)',
      description: 'Builds 12-month models, tracks actual spend, calculates CAC/LTV, and simulates pivots.',
      currentTask: 'Idle. Waiting for Stripe link.',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'coaching',
      name: 'Coaching Agent',
      role: 'Mentor / Accountability',
      status: 'active',
      x: 300,
      y: 330,
      color: '#a855f7',
      glowColor: 'rgba(168, 85, 247, 0.4)',
      description: 'Provokes Socratic check-ins, calculates momentum scores, challenges founder blockers daily.',
      currentTask: 'Analyzing standup mood index...',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.904-4.452L18 21l3-11h-9.813zM9 10.5h.008v.008H9V10.5zm0 3.5h.008v.008H9V14zm0-7h.008v.008H9V7zm3.5 7h.008v.008h-.008V14zm0-3.5h.008v.008h-.008v-.008zm0-3.5h.008v.008h-.008V7z" />
        </svg>
      )
    }
  ]

  const vaultX = 300
  const vaultY = 190

  return (
    <div className="border border-[#1a1a1a] bg-[#050505] rounded-3xl p-6 relative overflow-hidden flex flex-col h-[460px] justify-between shadow-2xl">
      {/* Visual background grid */}
      <div className="absolute inset-0 forge-grid-bg opacity-40 pointer-events-none" />

      {/* Header Info */}
      <div className="z-10 flex justify-between items-start">
        <div>
          <h3 className="text-[14px] font-bold tracking-[0.06em] uppercase text-[#6366f1] flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Co-Founder Agent Network
          </h3>
          <p className="text-[12px] text-[#525252] mt-0.5">Real-time workspace collaboration & memory sharing</p>
        </div>
        <div className="text-[11px] font-mono text-[#525252] bg-[#0a0a0a] border border-[#1a1a1a] px-2.5 py-1 rounded-md">
          Shared Memory: Active
        </div>
      </div>

      {/* Interactive Node Graph */}
      <div className="relative flex-1 w-full h-full min-h-[300px]">
        {/* SVG connection lines */}
        <svg className="absolute inset-0 w-full h-full select-none pointer-events-none">
          <defs>
            <radialGradient id="vaultGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="vaultBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>

          {/* Central Vault Glow Ring */}
          <circle cx={vaultX} cy={vaultY} r="60" fill="url(#vaultGlow)" className="animate-pulse" />

          {/* Connection Cables */}
          {agents.map((agent) => {
            const isHovered = hoveredAgent?.id === agent.id
            const isActive = agent.status === 'active'
            return (
              <g key={agent.id}>
                {/* Underlay Cable Line */}
                <line
                  x1={agent.x}
                  y1={agent.y}
                  x2={vaultX}
                  y2={vaultY}
                  stroke="#141416"
                  strokeWidth="3"
                />
                {/* Glowing Core Line */}
                <line
                  x1={agent.x}
                  y1={agent.y}
                  x2={vaultX}
                  y2={vaultY}
                  stroke={isHovered ? agent.color : '#1f1f23'}
                  strokeWidth="1.5"
                  className="transition-colors duration-300"
                />

                {/* Animated Data Packets flowing to Vault */}
                {isActive && (
                  <circle
                    r="3"
                    fill={agent.color}
                    className="opacity-75"
                    style={{
                      offsetPath: `path('M ${agent.x} ${agent.y} L ${vaultX} ${vaultY}')`,
                      animation: `forgeTimelineGlowV 3s infinite linear`,
                      animationDelay: `${Math.random() * 2}s`
                    }}
                  />
                )}
              </g>
            )
          })}
        </svg>

        {/* Central Core Memory Vault Node */}
        <div
          className="absolute z-20 flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 rounded-full cursor-help group transition-transform duration-300 hover:scale-105"
          style={{
            left: vaultX,
            top: vaultY,
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, #09090b 40%, #030303 100%)',
            border: '2px solid rgba(99, 102, 241, 0.45)',
            boxShadow: pulseCenter ? '0 0 24px rgba(99, 102, 241, 0.25)' : '0 0 16px rgba(99, 102, 241, 0.1)'
          }}
        >
          {/* Animated pulsing core */}
          <div className="absolute inset-1 rounded-full border border-dashed border-[#6366f1]/20 animate-[spin_40s_linear_infinite]" />
          
          <svg className="w-7 h-7 text-indigo-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <span className="text-[10px] uppercase font-bold tracking-[0.1em] text-indigo-400/90 mt-1">Vault</span>

          {/* Vault tooltip info */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-[#0a0a0d] border border-indigo-500/20 px-4 py-3 rounded-2xl w-48 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none select-none text-center">
            <p className="text-[12px] font-bold text-white uppercase tracking-wider">Founder Vault</p>
            <p className="text-[11px] text-[#737373] mt-1 leading-normal">Stores all code components, financial sheets, client leads, and agent context files.</p>
          </div>
        </div>

        {/* Outer Agent Nodes */}
        {agents.map((agent) => {
          const isHovered = hoveredAgent?.id === agent.id
          const isActive = agent.status === 'active'
          const isStandby = agent.status === 'standby'

          return (
            <div
              key={agent.id}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-all duration-300"
              style={{ left: agent.x, top: agent.y }}
              onMouseEnter={() => setHoveredAgent(agent)}
              onMouseLeave={() => setHoveredAgent(null)}
            >
              {/* Outer pulsing ring */}
              {isActive && (
                <div
                  className="absolute inset-0 -m-2.5 rounded-full border opacity-30 animate-ping"
                  style={{ borderColor: agent.color, animationDuration: '3s' }}
                />
              )}

              {/* Node bubble */}
              <div
                className="relative flex items-center justify-center rounded-2xl border transition-all duration-300 shadow-md"
                style={{
                  width: '46px',
                  height: '46px',
                  background: isHovered ? 'rgba(10, 10, 15, 0.95)' : 'rgba(5, 5, 5, 0.85)',
                  borderColor: isHovered ? agent.color : 'rgba(255, 255, 255, 0.04)',
                  boxShadow: isHovered ? `0 0 16px ${agent.glowColor}` : 'none',
                  color: isHovered ? '#ffffff' : '#a1a1a1',
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)'
                }}
              >
                {/* Mini Status Dot */}
                <div
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#050505] ${
                    isActive
                      ? 'bg-indigo-400'
                      : isStandby
                      ? 'bg-amber-400'
                      : 'bg-neutral-600'
                  }`}
                />
                
                {agent.icon}
              </div>

              {/* Label */}
              <span
                className={`text-[11px] font-medium tracking-tight mt-1.5 transition-colors duration-200 ${
                  isHovered ? 'text-white' : 'text-[#737373]'
                }`}
              >
                {agent.name.split(' ')[0]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Floating Detail Tooltip Info (Locks to bottom of container) */}
      <div className="z-10 h-16 border-t border-[#1a1a1a] pt-3 mt-3 flex items-center justify-between">
        {hoveredAgent ? (
          <div className="w-full flex items-center justify-between animate-fade-in text-[13px]">
            <div className="space-y-0.5 max-w-[75%]">
              <p className="font-semibold text-white flex items-center gap-1.5">
                {hoveredAgent.name}
                <span className="text-[11px] font-normal text-[#525252]">({hoveredAgent.role})</span>
              </p>
              <p className="text-[12px] text-[#737373] truncate leading-normal">{hoveredAgent.description}</p>
            </div>
            <div className="text-right">
              <span className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded ${
                hoveredAgent.status === 'active' 
                  ? 'bg-indigo-500/10 text-indigo-400' 
                  : hoveredAgent.status === 'standby'
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-neutral-500/10 text-neutral-400'
              }`}>
                {hoveredAgent.currentTask || hoveredAgent.status}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full text-center text-[12px] text-[#525252] italic">
            Hover over an agent node to view active context, roles, and vault connection logs.
          </div>
        )}
      </div>
    </div>
  )
}
