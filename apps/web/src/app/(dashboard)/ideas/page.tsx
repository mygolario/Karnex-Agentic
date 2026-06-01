import React from 'react'

export default function IdeasPage() {
  const mockValidatedIdeas = [
    {
      id: 1,
      title: 'Automated Freelance Retainer Invoicing',
      pain: 'Contractors waste hours manually calculating hours and billing clients every month.',
      demand: 'High',
      wedge: 'Integrated time tracking + auto stripe invoicing without a heavy CRM.',
      score: '88/100',
    },
    {
      id: 2,
      title: 'No-Code Webhook Filter and Router',
      pain: 'Developers struggle to parse, filter, and fan out webhooks cleanly between SaaS APIs.',
      demand: 'Medium',
      wedge: 'Visual node-based editor specifically optimizing raw webhook payload filters.',
      score: '76/100',
    },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] pb-6">
        <h1 className="font-display text-3xl font-bold text-white">
          Dream Engine
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Transform raw frustrations, daily annoyances, and target customer complaints into validated product opportunities.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Form Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-200 tracking-tight">
              Pain-to-Product Transformer
            </h2>
            <p className="text-xs text-zinc-500">
              Paste customer feedback, app store complaints, or your own daily workflow bottlenecks. Our agents will dissect it for latent software opportunities.
            </p>
            
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                Raw Input Data
              </label>
              <textarea
                placeholder="E.g., I spend 2 hours every week mapping client invoices to stripe payments. It should be automated. Customers complain that the invoice layout is too complicated..."
                rows={6}
                className="w-full rounded-lg border border-[#1a1a1a] bg-[#030303] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans transition-all resize-none"
              />
            </div>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition-all cursor-pointer shadow-md shadow-indigo-500/10"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.982-11.795M20.618 3.518a.75.75 0 01.03 1.06l-1.42 1.42a9 9 0 00-12.68 0l-1.42-1.42a.75.75 0 111.06-1.06l1.42 1.42a7.5 7.5 0 0110.56 0l1.42-1.42a.75.75 0 011.06 0z" />
              </svg>
              Extract Product Wedge
            </button>
          </div>

          {/* Validated Ideas Feed */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-mono">
              Validated Product Hypotheses
            </h2>
            
            <div className="space-y-4">
              {mockValidatedIdeas.map((idea) => (
                <div key={idea.id} className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-200">{idea.title}</h3>
                      <p className="mt-1 text-xs text-zinc-400 leading-relaxed"><span className="text-zinc-500 font-medium">Pain:</span> {idea.pain}</p>
                    </div>
                    <span className="rounded bg-indigo-500/5 px-2 py-0.5 text-[10px] font-semibold text-indigo-400 ring-1 ring-inset ring-indigo-500/20 font-mono shrink-0">
                      Score: {idea.score}
                    </span>
                  </div>
                  <div className="border-t border-[#1a1a1a]/60 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                    <p className="text-zinc-500"><span className="text-zinc-400 font-semibold font-mono uppercase text-[9px] tracking-wide mr-1">Moat Wedge:</span>{idea.wedge}</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20 font-mono sm:self-end">
                      Demand: {idea.demand}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Stats & Sidebar */}
        <div className="space-y-6">
          
          {/* Intelligence Score */}
          <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-6 space-y-4">
            <span className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-mono">
              Market Intelligence
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-white tracking-tight">3</span>
              <span className="text-xs text-zinc-500 font-semibold">Ideas Analyzed</span>
            </div>
            <div className="border-t border-[#1a1a1a] pt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Validation Speed</span>
                <span className="font-semibold text-zinc-300">Fast (24h)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Competitive density scan</span>
                <span className="font-semibold text-zinc-300">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Target ICP definition</span>
                <span className="font-semibold text-emerald-400">Complete</span>
              </div>
            </div>
          </div>

          {/* Socratic Questions */}
          <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-6 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 tracking-wider uppercase font-mono">
              Idea Crystallizer Checklist
            </h3>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Every crystallized idea goes through a Socratic check across 6 critical dimensions before it hits the War Room.
            </p>
            <ul className="space-y-2.5 text-[11px] pt-2">
              <li className="flex items-center gap-2 text-zinc-400">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[9px] font-bold">1</span>
                Who suffers from the bottleneck?
              </li>
              <li className="flex items-center gap-2 text-zinc-400">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[9px] font-bold">2</span>
                What is the current manual workaround?
              </li>
              <li className="flex items-center gap-2 text-zinc-400">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 font-mono text-[9px] font-bold">3</span>
                What is the unique technological unlock?
              </li>
              <li className="flex items-center gap-2 text-zinc-400">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-800 text-zinc-600 font-mono text-[9px] font-bold">4</span>
                What is the monetization engine?
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  )
}
