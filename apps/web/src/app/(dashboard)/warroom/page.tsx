import React from 'react'

export default function WarRoomPage() {
  const sprints = [
    {
      id: 1,
      title: 'Sprint 2 — Database Models & API Schema',
      duration: 'May 28 - Jun 4',
      status: 'active',
      tasks: [
        { name: 'Implement Supabase DB schema for ideas list', status: 'done' },
        { name: 'Redesign Login & Signup views to Split-Screen', status: 'done' },
        { name: 'Create client-side routing and navigation modules', status: 'done' },
        { name: 'Configure custom Brevo SMTP server settings', status: 'in-progress' },
      ],
    },
    {
      id: 2,
      title: 'Sprint 3 — AI outreach-agent Pipeline',
      duration: 'Jun 5 - Jun 12',
      status: 'queued',
      tasks: [
        { name: 'Integrate outreach-agent FastAPI service endpoints', status: 'todo' },
        { name: 'Implement automated email template copy generators', status: 'todo' },
        { name: 'Create lead scoring table in dashboard view', status: 'todo' },
      ],
    },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            War Room
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Plan, coordinate, and execute your 90-day startup sprints with help from your AI co-founder.
          </p>
        </div>

        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition-all cursor-pointer shadow-md shadow-indigo-500/10 self-start md:self-center"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Recalibrate Roadmap
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sprint Timeline (Left) */}
        <div className="lg:col-span-2 space-y-6">
          
          <h2 className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-mono">
            Active Sprint Execution
          </h2>

          <div className="space-y-6">
            {sprints.map((sprint) => (
              <div
                key={sprint.id}
                className={`rounded-xl border p-6 bg-[#07070a] space-y-4 ${
                  sprint.status === 'active' ? 'border-indigo-500/20' : 'border-[#1a1a1a]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">{sprint.title}</h3>
                    <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{sprint.duration}</p>
                  </div>
                  {sprint.status === 'active' ? (
                    <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 ring-1 ring-inset ring-indigo-500/20 font-mono">
                      ACTIVE SPRINT
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-[#1a1a1a] px-2 py-0.5 text-[10px] font-medium text-zinc-500 font-mono">
                      QUEUED
                    </span>
                  )}
                </div>

                <div className="border-t border-[#1a1a1a] pt-4 space-y-3">
                  {sprint.tasks.map((task, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        {task.status === 'done' ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </span>
                        ) : task.status === 'in-progress' ? (
                          <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20">
                            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                          </span>
                        ) : (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-zinc-600 ring-1 ring-inset ring-zinc-800">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </span>
                        )}
                        <span className={`${task.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                          {task.name}
                        </span>
                      </div>

                      <span className={`text-[10px] font-mono capitalize ${
                        task.status === 'done' ? 'text-emerald-500' : task.status === 'in-progress' ? 'text-amber-500' : 'text-zinc-600'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Phase Tracker Sidebar (Right) */}
        <div className="space-y-6">
          
          <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-6 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-400 tracking-wider uppercase font-mono">
              90-Day Milestones
            </h3>
            
            <div className="relative border-l border-[#1a1a1a] ml-2.5 pl-5 space-y-6 py-2">
              {/* Milestone 1 */}
              <div className="relative">
                <span className="absolute -left-[26px] top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-[#050505]" />
                <h4 className="text-xs font-semibold text-zinc-300">Phase 1: Idea Crystallization</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">Completed (Day 1 - 10)</p>
              </div>

              {/* Milestone 2 */}
              <div className="relative">
                <span className="absolute -left-[26px] top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-indigo-500 ring-4 ring-[#050505]" />
                <h4 className="text-xs font-semibold text-zinc-300">Phase 2: MVP Scaffold & Build</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">In Progress (Day 11 - 40)</p>
              </div>

              {/* Milestone 3 */}
              <div className="relative">
                <span className="absolute -left-[26px] top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-[#1a1a1a] ring-4 ring-[#050505]" />
                <h4 className="text-xs font-semibold text-zinc-600">Phase 3: Launch & First Revenue</h4>
                <p className="text-[10px] text-zinc-700 mt-0.5">Locked (Day 41 - 90)</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-6 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 tracking-wider uppercase font-mono">
              War Room Rules
            </h3>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Karnex roadmaps are designed to prevent procrastination. Focus on completing the Must-Wins.
            </p>
            <div className="rounded bg-[#020203] border border-[#1a1a1a] p-3 text-[10px] text-zinc-400 font-mono">
              STATUS_SYS: OK<br />
              VELOCITY_RATIO: 1.1x<br />
              DEADLINE: July 30, 2026
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
