import React from 'react'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const userEmail = user?.email ?? ''
  const userFullName = user?.user_metadata?.full_name ?? userEmail.split('@')[0] ?? 'Founder'

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] pb-6">
        <h1 className="font-display text-3xl font-bold text-white">
          Settings
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Manage your founder profile, active project configurations, and AI LLM integrations.
        </p>
      </div>

      {/* Forms Container */}
      <div className="space-y-6">
        
        {/* Profile Settings */}
        <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-6 space-y-6">
          <h2 className="text-xs font-semibold text-zinc-400 tracking-wider uppercase font-mono border-b border-[#1a1a1a] pb-3">
            Founder Profile
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                Full Name
              </label>
              <input
                type="text"
                defaultValue={userFullName}
                className="w-full rounded-lg border border-[#1a1a1a] bg-[#030303] px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                Email Address
              </label>
              <input
                type="email"
                defaultValue={userEmail}
                disabled
                className="w-full rounded-lg border border-[#1a1a1a] bg-[#030303]/60 px-3.5 py-2 text-sm text-zinc-500 cursor-not-allowed focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Project Credentials settings */}
        <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-6 space-y-6">
          <h2 className="text-xs font-semibold text-zinc-400 tracking-wider uppercase font-mono border-b border-[#1a1a1a] pb-3">
            Startup & Integrations Configuration
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                  Startup Name
                </label>
                <input
                  type="text"
                  placeholder="E.g., Karnex AI"
                  defaultValue="Karnex"
                  className="w-full rounded-lg border border-[#1a1a1a] bg-[#030303] px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                  Custom Domain
                </label>
                <input
                  type="text"
                  placeholder="E.g., karnexai.com"
                  className="w-full rounded-lg border border-[#1a1a1a] bg-[#030303] px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                Google Gemini API Key
              </label>
              <input
                type="password"
                placeholder="••••••••••••••••••••••••••••••••••••••••"
                className="w-full rounded-lg border border-[#1a1a1a] bg-[#030303] px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="rounded-lg border border-[#1a1a1a] hover:bg-white/[0.02] px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            type="button"
            className="rounded-lg bg-indigo-500 hover:bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-all cursor-pointer shadow-md shadow-indigo-500/10"
          >
            Save Configuration
          </button>
        </div>

      </div>
    </div>
  )
}
