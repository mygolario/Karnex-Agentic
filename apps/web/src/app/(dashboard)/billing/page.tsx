import React from 'react'

const pricingTiers = [
  {
    name: 'Starter',
    price: '$29',
    description: 'Dream Engine + Architect + 2 Execution Agents (Builder + Research)',
    features: ['Dream Engine', '90-Day War Room', 'Builder Agent (Basic)', 'Research Agent'],
    badge: null,
  },
  {
    name: 'Founder',
    price: '$149',
    description: 'Everything + Fundraising Agent + Financial Agent + unlimited tasks',
    features: ['All Execution Agents', 'Fundraising Agent', 'Financial Modeling Agent', 'Unlimited Agent tasks', 'Accountability Standups'],
    badge: 'Popular',
  },
  {
    name: 'Studio',
    price: '$299',
    description: 'Multi-project support, white-label options, and 2 team seats included',
    features: ['All Founder Features', 'Multi-project support', '2 Team seats', 'White-label reporting', 'Dedicated compute cluster'],
    badge: null,
  },
]

export default function BillingPage() {
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
          <h3 className="text-xl font-bold text-white">Free Trial</h3>
          <p className="text-xs text-zinc-500">Trial ends on June 15, 2026. Upgrade to unlock all features.</p>
        </div>

        {/* Compute usage */}
        <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-6 space-y-3">
          <span className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-mono">
            Compute Limit
          </span>
          <h3 className="text-xl font-bold text-white">12 / 50</h3>
          <p className="text-xs text-zinc-500">Agent tasks run this billing cycle. Resets on July 1, 2026.</p>
        </div>

        {/* Invoices summary */}
        <div className="rounded-xl border border-[#1a1a1a] bg-[#07070a] p-6 space-y-3">
          <span className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-mono">
            Payment Method
          </span>
          <h3 className="text-xl font-bold text-white">None Linked</h3>
          <p className="text-xs text-zinc-500">Upgrade your tier to configure secure billing credentials.</p>
        </div>
      </div>

      {/* Upgrade Options */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-mono">
          Available Subscription Tiers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingTiers.map((tier) => (
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
                className={`mt-6 w-full rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  tier.badge
                    ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                    : 'border border-[#1a1a1a] hover:bg-white/[0.02] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Choose {tier.name} Plan
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
