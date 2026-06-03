'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/integrations', label: 'Connect', exact: true },
  { href: '/integrations/automate', label: 'Automate', exact: false },
  { href: '/integrations/status', label: 'Status', exact: false },
]

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="mx-auto max-w-[1000px] space-y-10 pb-16 dash-reveal">
      <div className="border-b border-[#1a1a1a] pb-6 space-y-5">
        <div>
          <h1 className="font-display font-bold text-[28px] text-white tracking-[-0.025em]">
            Integrations Hub
          </h1>
          <p className="text-[13px] text-[#737373] mt-1">
            Connect accounts, enable automations, and monitor integration health
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-[#1a1a1a] bg-[#050505] p-1 gap-1">
          {tabs.map((tab) => {
            const active = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                  active
                    ? 'bg-[#6366f1] text-white'
                    : 'text-[#737373] hover:text-[#e5e5e5]'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      {children}
    </div>
  )
}
