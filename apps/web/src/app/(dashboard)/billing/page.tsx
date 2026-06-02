'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/Skeleton'
import { ErrorBoundary } from '@/components/ErrorBoundary'

interface SubscriptionRecord {
  plan: string
  status: string
  expires_at: string
  tasks_used_this_cycle: number
  tasks_limit: number
}

interface PaymentRecord {
  id: string
  amount_usd: number
  currency: string
  status: string
  created_at: string
}

const pricingTiers = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$29',
    description: 'Dream Engine + Architect + 2 Execution Agents (Builder + Research)',
    features: ['Dream Engine', '90-Day War Room', 'Builder Agent (Basic)', 'Research Agent'],
    badge: null,
  },
  {
    id: 'founder',
    name: 'Founder',
    price: '$149',
    description: 'Everything + Fundraising Agent + Financial Agent + unlimited tasks',
    features: ['All Execution Agents', 'Fundraising Agent', 'Financial Modeling Agent', 'Unlimited Agent tasks', 'Accountability Standups'],
    badge: 'Popular',
  },
  {
    id: 'studio',
    name: 'Studio',
    price: '$299',
    description: 'Multi-project support, white-label options, and 2 team seats included',
    features: ['All Founder Features', 'Multi-project support', '2 Team seats', 'White-label reporting', 'Dedicated compute cluster'],
    badge: null,
  },
]

export default function BillingPage() {
  return (
    <ErrorBoundary>
      <BillingContent />
    </ErrorBoundary>
  )
}

function BillingContent() {
  const supabase = createSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null)
  
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null)
  const [payments, setPayments] = useState<PaymentRecord[]>([])

  const loadBillingData = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // 1. Fetch subscription details
      const { data: subRes } = await supabase
        .from('subscriptions')
        .select('plan, status, expires_at, tasks_used_this_cycle, tasks_limit')
        .eq('founder_id', session.user.id)
        .maybeSingle()

      if (subRes) {
        setSubscription(subRes as SubscriptionRecord)
      } else {
        setSubscription(null)
      }

      // 2. Fetch payment transactions
      const { data: payRes } = await supabase
        .from('payments')
        .select('id, amount_usd, currency, status, created_at')
        .eq('founder_id', session.user.id)
        .order('created_at', { ascending: false })

      if (payRes) {
        setPayments(payRes as PaymentRecord[])
      }
    } catch (err) {
      console.error('Error loading billing details:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadBillingData()
  }, [loadBillingData])

  const handleCheckout = async (planId: string) => {
    try {
      setSubmittingPlan(planId)
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan: planId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create invoice')
      }

      const data = await response.json()
      if (data.payLink) {
        window.location.href = data.payLink
      } else {
        throw new Error('Payment gateway link was not returned.')
      }
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Unknown gateway error'
      alert(`Payment Initialization Failed: ${msg}`)
    } finally {
      setSubmittingPlan(null)
    }
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-10 pb-16 dash-reveal">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] pb-8">
        <h1 className="font-display font-bold text-[clamp(28px,3.5vw,36px)] leading-[1.15] tracking-[-0.025em] text-white">
          Billing & Subscriptions
        </h1>
        <p className="mt-2 text-[15px] text-[#737373]">
          Manage your startup subscription plan, transaction history, and agent compute resource limits.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#1a1a1a] border border-[#1a1a1a] rounded-2xl overflow-hidden">
        {/* Current Plan */}
        <div className="bg-[#050505] p-6 space-y-3">
          <span className="muted-label">
            Active Plan
          </span>
          {loading ? (
            <Skeleton className="h-6 w-24 bg-[#1a1a1a]" />
          ) : subscription ? (
            <>
              <h3 className="text-xl font-bold text-white capitalize">{subscription.plan}</h3>
              <p className="text-xs text-[#a1a1a1] leading-normal">
                Status: <span className="text-emerald-450 capitalize">{subscription.status}</span>. Expires on {new Date(subscription.expires_at).toLocaleDateString()}.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-white">Free Trial</h3>
              <p className="text-xs text-[#525252]">Upgrade to an active tier below to deploy unlimited agents.</p>
            </>
          )}
        </div>

        {/* Compute usage */}
        <div className="bg-[#050505] p-6 space-y-3">
          <span className="muted-label">
            Compute Limit
          </span>
          {loading ? (
            <Skeleton className="h-6 w-24 bg-[#1a1a1a]" />
          ) : (
            <>
              <h3 className="text-xl font-bold text-white">
                {subscription?.tasks_used_this_cycle ?? 0} / {subscription?.tasks_limit ?? 10}
              </h3>
              <p className="text-xs text-[#a1a1a1]">Agent tasks run in current billing cycle.</p>
            </>
          )}
        </div>

        {/* Payment Method */}
        <div className="bg-[#050505] p-6 space-y-3">
          <span className="muted-label">
            Payment Mode
          </span>
          <h3 className="text-xl font-bold text-white">USDT / USDC</h3>
          <p className="text-xs text-[#a1a1a1]">Decentralized merchant checkout via OxaPay.</p>
        </div>
      </div>

      {/* Upgrade Options */}
      <div className="space-y-4">
        <h2 className="section-label">
          Available Subscription Tiers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#1a1a1a] border border-[#1a1a1a] rounded-2xl overflow-hidden">
          {pricingTiers.map((tier) => {
            const isCurrentPlan = subscription?.plan?.toLowerCase() === tier.id.toLowerCase()
            const isCheckingOut = submittingPlan === tier.id

            return (
              <div
                key={tier.name}
                className={`bg-[#050505] p-6 flex flex-col justify-between relative ${
                  tier.badge ? 'bg-[#6366f1]/[0.01]' : ''
                }`}
              >
                {tier.badge && (
                  <span className="absolute top-6 right-6 rounded-full bg-[#6366f1] px-2.5 py-0.5 text-[10px] font-medium text-white uppercase tracking-[0.06em]">
                    {tier.badge}
                  </span>
                )}
                
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">{tier.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="font-display text-3xl font-bold text-white tracking-tight">{tier.price}</span>
                      <span className="text-xs text-[#525252]">/ mo</span>
                    </div>
                    <p className="mt-2 text-xs text-[#a1a1a1] leading-relaxed">{tier.description}</p>
                  </div>

                  <div className="border-t border-[#1a1a1a] pt-4">
                    <ul className="space-y-2.5">
                      {tier.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-[12px] text-[#a1a1a1]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#6366f1] opacity-60" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCheckout(tier.id)}
                  disabled={isCurrentPlan || isCheckingOut || loading}
                  className={`dash-btn w-full mt-6 ${
                    isCurrentPlan
                      ? 'border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 opacity-100 cursor-default'
                      : tier.badge
                      ? 'dash-btn-primary'
                      : 'dash-btn-secondary'
                  }`}
                >
                  {isCurrentPlan ? 'Current Plan' : isCheckingOut ? 'Opening Gateway...' : `Choose ${tier.name}`}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Transaction History Log */}
      <div className="space-y-4">
        <h2 className="section-label">
          Billing Invoice History
        </h2>
        <div className="dash-card overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-6 w-full bg-[#1a1a1a]" />
              <Skeleton className="h-6 w-full bg-[#1a1a1a]" />
            </div>
          ) : payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1a1a1a] bg-[#050505] text-[11px] font-semibold text-[#525252] uppercase tracking-[0.06em]">
                    <th className="px-6 py-4">Invoice ID</th>
                    <th className="px-6 py-4">USD Value</th>
                    <th className="px-6 py-4">Asset</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a] text-xs">
                  {payments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-white/[0.01] transition-colors text-[#e5e5e5]">
                      <td className="px-6 py-4 font-mono text-[11px] text-[#a1a1a1]">{pay.id}</td>
                      <td className="px-6 py-4 font-semibold text-white">${pay.amount_usd}</td>
                      <td className="px-6 py-4 font-mono text-[#a1a1a1]">{pay.currency}</td>
                      <td className="px-6 py-4 text-[#737373]">{new Date(pay.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border capitalize ${
                          pay.status === 'confirmed'
                            ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400'
                            : pay.status === 'confirming'
                            ? 'bg-amber-950/30 border-amber-500/20 text-amber-450'
                            : 'bg-[#1a1a1a] border-[#262626] text-[#525252]'
                        }`}>
                          {pay.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-[#525252] text-sm">No transaction invoices recorded.</div>
          )}
        </div>
      </div>
    </div>
  )
}
