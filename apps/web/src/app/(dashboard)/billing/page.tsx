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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        // Redirect user to the secure payment page
        // eslint-disable-next-line react-hooks/immutability
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
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] pb-6">
        <h1 className="font-display text-3xl font-bold text-white">
          Billing & Subscriptions
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Manage your startup subscription plan, transaction history, and agent compute resource limits.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Plan */}
        <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-6 space-y-3">
          <span className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-mono">
            Active Plan
          </span>
          {loading ? (
            <Skeleton className="h-6 w-24" />
          ) : subscription ? (
            <>
              <h3 className="text-xl font-bold text-white capitalize">{subscription.plan}</h3>
              <p className="text-xs text-zinc-500 leading-normal">
                Status: <span className="text-emerald-400 capitalize">{subscription.status}</span>. Expires on {new Date(subscription.expires_at).toLocaleDateString()}.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-white">Free Trial</h3>
              <p className="text-xs text-zinc-500">Upgrade to an active tier below to deploy unlimited agents.</p>
            </>
          )}
        </div>

        {/* Compute usage */}
        <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-6 space-y-3">
          <span className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-mono">
            Compute Limit
          </span>
          {loading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <>
              <h3 className="text-xl font-bold text-white">
                {subscription?.tasks_used_this_cycle ?? 0} / {subscription?.tasks_limit ?? 10}
              </h3>
              <p className="text-xs text-zinc-500">Agent tasks run in current billing cycle.</p>
            </>
          )}
        </div>

        {/* Payment Method */}
        <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-6 space-y-3">
          <span className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-mono">
            Payment Mode
          </span>
          <h3 className="text-xl font-bold text-white">USDT / USDC</h3>
          <p className="text-xs text-zinc-500">Decentralized merchant checkout via OxaPay.</p>
        </div>
      </div>

      {/* Upgrade Options */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-mono">
          Available Subscription Tiers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingTiers.map((tier) => {
            const isCurrentPlan = subscription?.plan?.toLowerCase() === tier.id.toLowerCase()
            const isCheckingOut = submittingPlan === tier.id

            return (
              <div
                key={tier.name}
                className={`rounded-xl border p-6 flex flex-col justify-between bg-[#07070a] relative ${
                  tier.badge ? 'border-indigo-500/30 shadow-lg shadow-indigo-500/5' : 'border-[#1a1a1a]'
                }`}
              >
                {tier.badge && (
                  <span className="absolute -top-2.5 right-6 rounded bg-indigo-500 px-2 py-0.5 text-[9px] font-bold text-white font-mono uppercase tracking-wider">
                    {tier.badge}
                  </span>
                )}
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">{tier.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white tracking-tight">{tier.price}</span>
                      <span className="text-xs text-zinc-600 font-mono">/ mo</span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500 leading-relaxed">{tier.description}</p>
                  </div>

                  <div className="border-t border-[#1a1a1a] pt-4">
                    <ul className="space-y-2">
                      {tier.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-[11px] text-zinc-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
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
                  className={`mt-6 w-full rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isCurrentPlan
                      ? 'border border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                      : tier.badge
                      ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                      : 'border border-[#1a1a1a] hover:bg-white/[0.02] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isCurrentPlan ? 'Current Plan' : isCheckingOut ? 'Opening Gateway...' : `Choose ${tier.name} Plan`}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Transaction History Log */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-mono">
          Billing Invoice History
        </h2>
        <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : payments.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1a1a1a] bg-[#020203] text-xs font-semibold text-zinc-400 uppercase font-mono">
                  <th className="px-6 py-4">Invoice ID</th>
                  <th className="px-6 py-4">USD Value</th>
                  <th className="px-6 py-4">Asset</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a] text-xs">
                {payments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-white/[0.01] transition-all text-zinc-300">
                    <td className="px-6 py-4 font-mono text-[10px] text-zinc-400">{pay.id}</td>
                    <td className="px-6 py-4 font-bold text-white">${pay.amount_usd}</td>
                    <td className="px-6 py-4 font-mono text-zinc-400">{pay.currency}</td>
                    <td className="px-6 py-4 text-zinc-500">{new Date(pay.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border capitalize ${
                        pay.status === 'confirmed'
                          ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400'
                          : pay.status === 'confirming'
                          ? 'bg-amber-950/30 border-amber-500/20 text-amber-400'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                      }`}>
                        {pay.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-zinc-600 text-sm">No transaction invoices recorded.</div>
          )}
        </div>
      </div>
    </div>
  )
}
