'use client'

import React, { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/Skeleton'
import { ErrorBoundary } from '@/components/ErrorBoundary'

interface Contact {
  first_name: string
  last_name: string
  email: string
  company: string
  title: string
  linkedin_url?: string
}

interface CampaignContact extends Contact {
  status: string
}

interface CampaignMessage {
  step: number
  delay_days: number
  subject: string
  body: string
  variant: string
}

interface SendSchedule {
  best_days: string[]
  time_of_day: string
  timezone: string
}

interface CampaignDetails {
  id?: string
  name: string
  messages: CampaignMessage[]
  send_schedule: SendSchedule
  personalization_notes: string
  ab_variants?: CampaignMessage[]
}

const AGENT_SERVICE_URL = process.env.NEXT_PUBLIC_AGENT_SERVICE_URL || 'http://localhost:8000'

export default function OutreachPage() {
  return (
    <ErrorBoundary>
      <OutreachContent />
    </ErrorBoundary>
  )
}

function OutreachContent() {
  const [loading, setLoading] = useState(false)
  const [startupId, setStartupId] = useState('')
  const [goal, setGoal] = useState('Get customer discovery interviews')
  const [audience, setAudience] = useState('SaaS solo founders and indie hackers')
  const [tone, setTone] = useState<'formal' | 'casual' | 'direct'>('direct')
  const [sequenceLength, setSequenceLength] = useState(3)
  const [referenceContent, setReferenceContent] = useState('')
  const [contactsText, setContactsText] = useState(
    'Aris, Kiani, aris@example.com, Karnex Tech, CEO\nSarah, Connor, sarah@cyberdyne.co, Cyberdyne, VP Engineering'
  )
  
  const [activeCampaign, setActiveCampaign] = useState<CampaignDetails | null>(null)
  const [campaignContacts, setCampaignContacts] = useState<CampaignContact[]>([])
  const [submittingApprove, setSubmittingApprove] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [showGmailModal, setShowGmailModal] = useState(false)

  const supabase = createSupabaseBrowserClient()

  // Load startup ID
  useEffect(() => {
    const loadStartup = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const { data: startup } = await supabase
        .from('startups')
        .select('id')
        .eq('founder_id', session.user.id)
        .limit(1)
        .maybeSingle()
        
      if (startup) {
        setStartupId(startup.id)
      } else {
        // Fallback: create a dummy startup for dev if none exists
        try {
          const { data: newStartup } = await supabase
            .from('startups')
            .insert({
              founder_id: session.user.id,
              name: 'My Startup Project',
              description: 'Generated startup project context.'
            })
            .select()
            .single()
          if (newStartup) setStartupId(newStartup.id)
        } catch (e) {
          console.error('Failed to resolve startup:', e)
        }
      }
    }
    loadStartup()
  }, [supabase])

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!startupId) {
      alert('Please configure a startup profile first in dashboard.')
      return
    }

    // Parse contacts from CSV/textarea
    const parsedContacts: Contact[] = []
    const lines = contactsText.split('\n')
    for (const line of lines) {
      if (!line.trim()) continue
      const parts = line.split(',').map(p => p.trim())
      if (parts.length >= 3) {
        parsedContacts.push({
          first_name: parts[0],
          last_name: parts[1],
          email: parts[2],
          company: parts[3] || 'General Company',
          title: parts[4] || 'Professional',
          linkedin_url: parts[5] || ''
        })
      }
    }

    if (parsedContacts.length === 0) {
      alert('Please add at least one contact in "First, Last, Email, Company, Title" format.')
      return
    }

    try {
      setLoading(true)
      setIsApproved(false)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const token = session.access_token

      // Trigger Outreach agent
      const response = await fetch(`${AGENT_SERVICE_URL}/v1/agents/outreach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          startup_id: startupId,
          campaign_goal: goal,
          target_audience: audience,
          contacts: parsedContacts,
          channel: 'email',
          tone: tone,
          sequence_length: sequenceLength,
          reference_content: referenceContent
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate campaign')
      }

      const result = await response.json()
      
      // Fetch the newly created campaign details from DB to get database IDs
      // We can also parse from the latest run outputs
      const { data: campaignData } = await supabase
        .from('outreach_campaigns')
        .select('*')
        .eq('founder_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (campaignData) {
        setActiveCampaign({
          id: campaignData.id,
          name: campaignData.name,
          messages: result.campaign.messages,
          send_schedule: result.campaign.send_schedule,
          personalization_notes: result.campaign.personalization_notes,
          ab_variants: result.campaign.ab_variants
        })

        // Fetch contacts for this campaign
        const { data: contactData } = await supabase
          .from('outreach_contacts')
          .select('*')
          .eq('campaign_id', campaignData.id)
        if (contactData) {
          setCampaignContacts(contactData)
        }
      }
    } catch (err) {
      console.error(err)
      alert('Failed to generate outreach sequence.')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveCampaign = async () => {
    if (!activeCampaign || !activeCampaign.id) return

    try {
      setSubmittingApprove(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const token = session.access_token

      const response = await fetch(`${AGENT_SERVICE_URL}/v1/campaigns/${activeCampaign.id}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.ok) {
        setIsApproved(true)
        // Refresh contact list status
        const { data: contactData } = await supabase
          .from('outreach_contacts')
          .select('*')
          .eq('campaign_id', activeCampaign.id)
        if (contactData) {
          setCampaignContacts(contactData)
        }
      } else {
        alert('Failed to approve campaign.')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmittingApprove(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
          AI Outreach Builder
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Create highly-personalized, human-like outreach email campaigns for early sales and customer discovery.
        </p>
      </div>

      {/* Gmail OAuth callout CTA banner */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.03] p-5 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.22 0l-2.25 1.5" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-200">Connect Gmail to Send Drafts</h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Authorized campaign emails will sync directly into your Gmail drafts folder. Currently running in simulation mode.
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowGmailModal(true)}
          className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-violet-500 shrink-0"
        >
          Connect Gmail Account
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Form Controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-white/[0.06] bg-[#0a0a14]/60 p-6 backdrop-blur-xl">
            <h2 className="text-base font-bold text-zinc-100 mb-4">Configure Sequence</h2>
            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-400">Campaign Goal</label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-black/40 p-2.5 text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-400">Target Audience Description</label>
                <textarea
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full min-h-[60px] rounded-lg border border-white/[0.08] bg-black/40 p-2.5 text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-400">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as 'formal' | 'casual' | 'direct')}
                    className="w-full rounded-lg border border-white/[0.08] bg-black/40 p-2.5 text-zinc-200 focus:border-violet-500 focus:outline-none"
                  >
                    <option value="direct">Direct</option>
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-400">Sequence Steps</label>
                  <select
                    value={sequenceLength}
                    onChange={(e) => setSequenceLength(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/[0.08] bg-black/40 p-2.5 text-zinc-200 focus:border-violet-500 focus:outline-none"
                  >
                    <option value={1}>1 Email</option>
                    <option value={2}>2 Emails</option>
                    <option value={3}>3 Emails</option>
                    <option value={4}>4 Emails</option>
                    <option value={5}>5 Emails</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-400">Upload Contacts (Comma-Separated CSV)</label>
                <div className="text-[10px] text-zinc-500 mb-1">Format: First, Last, Email, Company, Title</div>
                <textarea
                  value={contactsText}
                  onChange={(e) => setContactsText(e.target.value)}
                  className="w-full min-h-[80px] rounded-lg border border-white/[0.08] bg-black/40 p-2.5 font-mono text-[11px] text-zinc-200 focus:border-violet-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-400">Product Brief/Context (Optional)</label>
                <textarea
                  value={referenceContent}
                  onChange={(e) => setReferenceContent(e.target.value)}
                  placeholder="Paste startup brief, elevator pitch, or landing page copy..."
                  className="w-full min-h-[60px] rounded-lg border border-white/[0.08] bg-black/40 p-2.5 text-zinc-200 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !startupId}
                className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 py-3 text-center text-xs font-semibold text-white shadow-lg transition-all hover:brightness-110 disabled:opacity-40"
              >
                {loading ? 'Generating Campaign templates...' : 'Compose Campaign Drafts'}
              </button>
            </form>
          </div>
        </div>

        {/* Results / Review Panels */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          ) : activeCampaign ? (
            <>
              {/* Campaign preview */}
              <div className="rounded-xl border border-white/[0.06] bg-[#0a0a14]/60 p-6 backdrop-blur-xl space-y-6">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-zinc-200">{activeCampaign.name}</h2>
                    <p className="text-xs text-zinc-500">Draft Campaign Template Sequence</p>
                  </div>

                  {!isApproved ? (
                    <button
                      onClick={handleApproveCampaign}
                      disabled={submittingApprove}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-40"
                    >
                      {submittingApprove ? 'Approving...' : 'Approve & Push to Queue'}
                    </button>
                  ) : (
                    <span className="rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 text-xs font-bold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                      Approved (Pushed to Mock Queue)
                    </span>
                  )}
                </div>

                {/* Send Schedule widget */}
                <div className="rounded-lg bg-white/[0.02] p-4 flex flex-wrap gap-6 text-xs border border-white/[0.04]">
                  <div>
                    <span className="font-semibold text-zinc-500 uppercase tracking-wider block">Recommended Days</span>
                    <span className="text-zinc-200 mt-1 block">{activeCampaign.send_schedule.best_days.join(', ')}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-500 uppercase tracking-wider block">Best Hour Window</span>
                    <span className="text-zinc-200 mt-1 block">{activeCampaign.send_schedule.time_of_day}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-500 uppercase tracking-wider block">Recipient Context</span>
                    <span className="text-zinc-200 mt-1 block">{activeCampaign.send_schedule.timezone}</span>
                  </div>
                </div>

                {/* Message templates */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email Sequence Steps</h3>
                  
                  {activeCampaign.messages.map((msg, index) => {
                    const hasBVariant = activeCampaign.ab_variants?.find(v => v.step === msg.step)
                    return (
                      <div key={index} className="rounded-lg border border-white/[0.05] bg-black/30 p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                          <span className="text-xs font-bold text-violet-400">
                            Step {msg.step} {msg.delay_days > 0 ? `(Wait ${msg.delay_days} days)` : '(Initial)'}
                          </span>
                          <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-400">
                            Variant {msg.variant}
                          </span>
                        </div>
                        
                        <div className="text-xs space-y-2">
                          <p className="text-zinc-200 font-semibold">
                            <span className="text-zinc-500 mr-2">Subject:</span> {msg.subject}
                          </p>
                          <div className="text-zinc-400 whitespace-pre-line leading-relaxed font-sans bg-zinc-950/20 p-3 rounded border border-white/[0.02]">
                            {msg.body}
                          </div>
                        </div>

                        {/* Display A/B variant if exists for this step */}
                        {hasBVariant && (
                          <div className="mt-3 border-t border-dashed border-white/[0.06] pt-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-amber-400">A/B Testing Option</span>
                              <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-400">
                                Variant {hasBVariant.variant}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-200 font-semibold">
                              <span className="text-zinc-500 mr-2">Subject B:</span> {hasBVariant.subject}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Personalization Notes */}
                <div className="rounded-lg bg-zinc-950/40 border border-white/[0.04] p-4 text-xs space-y-2">
                  <h4 className="font-bold text-zinc-400 uppercase tracking-wider">AI Personalization Summary</h4>
                  <p className="text-zinc-400 leading-relaxed italic">{activeCampaign.personalization_notes}</p>
                </div>
              </div>

              {/* Contacts loaded table */}
              <div className="rounded-xl border border-white/[0.06] bg-[#0a0a14]/60 p-6 backdrop-blur-xl space-y-4">
                <h3 className="text-sm font-bold text-zinc-200">Campaign Contacts ({campaignContacts.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-zinc-500">
                        <th className="pb-2 font-semibold">Name</th>
                        <th className="pb-2 font-semibold">Email</th>
                        <th className="pb-2 font-semibold">Company & Title</th>
                        <th className="pb-2 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {campaignContacts.map((contact, idx) => (
                        <tr key={idx} className="text-zinc-300">
                          <td className="py-2.5 font-medium">{contact.first_name} {contact.last_name}</td>
                          <td className="py-2.5 text-zinc-400 font-mono text-[11px]">{contact.email}</td>
                          <td className="py-2.5 text-zinc-400">{contact.title} at {contact.company}</td>
                          <td className="py-2.5 text-right">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                              contact.status === 'pending'
                                ? 'bg-zinc-900 border-zinc-700 text-zinc-400'
                                : 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400'
                            }`}>
                              {isApproved && contact.status === 'pending' ? 'queued' : contact.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-[#0a0a14]/60 p-12 text-center text-zinc-500">
              <p className="text-sm">Configure parameters and click &ldquo;Compose Campaign Drafts&rdquo; on the left to start.</p>
            </div>
          )}
        </div>
      </div>

      {/* Gmail OAuth connection modal (simulation) */}
      {showGmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-[#0d0d18] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-bold text-zinc-200">Connect Gmail (Simulation)</h3>
              <button 
                onClick={() => setShowGmailModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
            
            <p className="text-xs text-zinc-400 leading-relaxed">
              In production, this would trigger the Google OAuth 2.0 consent flow to request the <code>https://www.googleapis.com/auth/gmail.compose</code> scope.
            </p>
            
            <div className="rounded-lg bg-white/[0.02] p-3 text-[10px] font-mono text-zinc-500 border border-white/[0.04]">
              Redirect URL: http://localhost:3000/api/auth/callback/gmail
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setShowGmailModal(false)}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 transition-all hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  alert('Gmail connection simulated successfully!')
                  setShowGmailModal(false)
                }}
                className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-violet-500"
              >
                Simulate Consent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
