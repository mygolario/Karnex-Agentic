'use client'

import React, { useState } from 'react'

interface ProjectLauncherProps {
  onSelectTemplate: (prompt: string) => void
  recentBuilds: Array<{ id: string; spec: string; created_at: string }>
  onLoadBuild: (id: string) => void
}

const templates = [
  {
    title: 'SaaS Landing Page',
    desc: 'Hero, features, pricing, CTA sections',
    prompt: 'Create a dark-themed SaaS landing page with a bold hero section, feature cards grid, testimonial section, pricing comparison table, and an email waitlist form. Use modern typography and subtle gradients.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    title: 'Admin Dashboard',
    desc: 'Charts, data tables, sidebar nav',
    prompt: 'Build an admin dashboard with a collapsible sidebar, top stats cards showing revenue/users/conversions, a line chart for weekly trends, a data table with sortable columns, and a recent activity feed. Dark theme.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: 'Auth Flow',
    desc: 'Login, register, password reset',
    prompt: 'Create authentication pages: a login form with email/password and social login buttons, a registration form with name/email/password/confirm fields, and a password reset page. Include form validation states. Dark theme with indigo accents.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    title: 'REST API',
    desc: 'Endpoints, database schema, CRUD',
    prompt: 'Generate a REST API with user management endpoints (CRUD), a PostgreSQL schema with users, posts, and comments tables with foreign keys, and a Supabase Row Level Security policy. Include API documentation comments.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
  {
    title: 'E-Commerce',
    desc: 'Product grid, cart, checkout',
    prompt: 'Build an e-commerce storefront with a product grid showing cards with image, title, price, and add-to-cart button. Include a slide-out cart sidebar with quantity controls and total, and a checkout form with shipping and payment fields. Dark theme.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    title: 'Blog',
    desc: 'Posts, categories, SEO-ready',
    prompt: 'Create a blog with a posts listing page showing cards with title, excerpt, date, and category badge. Include a single post page with rich typography, author info, and a related posts section. Dark theme with clean reading experience.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
]

export default function ProjectLauncher({ onSelectTemplate, recentBuilds, onLoadBuild }: ProjectLauncherProps) {
  const [prompt, setPrompt] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    onSelectTemplate(prompt.trim())
    setPrompt('')
  }

  return (
    <div className="h-full overflow-y-auto forge-scroll forge-grid-bg">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center">
          <h1 className="font-display text-[28px] font-bold text-white tracking-[-0.02em]">
            What do you want to build?
          </h1>
          <p className="text-[14px] text-zinc-500 mt-2">
            Describe your idea in plain English. Karnex agents will handle the rest.
          </p>
        </div>

        {/* Main prompt */}
        <form onSubmit={handleSubmit} className="mt-8">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Build a waitlist landing page with email capture, social proof section, and dark theme..."
            className="w-full bg-[#0a0a0e] border border-[#1a1a1a] hover:border-[#262626] focus:border-indigo-500/30 rounded-xl text-[14px] text-zinc-200 placeholder-zinc-700 p-4 resize-none focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!prompt.trim()}
            className="w-full mt-3 flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558e6] disabled:opacity-40 text-white text-[13px] font-medium rounded-lg px-5 py-2.5 transition-colors"
          >
            Start Building
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </form>

        {/* Templates */}
        <div className="mt-12">
          <p className="text-[11px] uppercase tracking-wider text-zinc-600 font-medium text-center">
            Or start from a template
          </p>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {templates.map((tmpl) => (
              <button
                key={tmpl.title}
                onClick={() => onSelectTemplate(tmpl.prompt)}
                className="text-left bg-[#0a0a0e] border border-[#141417] hover:border-[#262626] rounded-lg p-4 transition-colors group"
              >
                <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors">
                  {tmpl.icon}
                </span>
                <p className="text-[13px] font-medium text-zinc-300 mt-2.5">{tmpl.title}</p>
                <p className="text-[11px] text-zinc-600 mt-1">{tmpl.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent builds */}
        {recentBuilds.length > 0 && (
          <div className="mt-10">
            <p className="text-[11px] uppercase tracking-wider text-zinc-600 font-medium">
              Recent projects
            </p>
            <div className="flex gap-3 mt-3 overflow-x-auto forge-scroll pb-2">
              {recentBuilds.slice(0, 5).map((build) => (
                <button
                  key={build.id}
                  onClick={() => onLoadBuild(build.id)}
                  className="shrink-0 text-left bg-[#0a0a0e] border border-[#141417] hover:border-[#262626] rounded-lg p-3 min-w-[200px] max-w-[240px] transition-colors"
                >
                  <p className="text-[12px] text-zinc-400 line-clamp-2">{build.spec}</p>
                  <p className="text-[10px] text-zinc-600 mt-1.5">
                    {new Date(build.created_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
