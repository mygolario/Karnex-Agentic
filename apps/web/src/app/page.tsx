'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

/* ════════════════════════════════════════════════════════════
   KARNEX — Landing Page (Editorial Redesign)
   Design language: monochrome + restrained indigo accent,
   asymmetric grids, editorial typography, clean borders,
   purposeful whitespace, video-as-content.
   ════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const [navSolid, setNavSolid] = useState(false)
  const [openLayer, setOpenLayer] = useState<number | null>(0)
  const [mobileNav, setMobileNav] = useState(false)

  // ── scroll observer for reveals ──
  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('reveal-visible')
      }),
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el))

    return () => { window.removeEventListener('scroll', onScroll); io.disconnect() }
  }, [])

  // ── counter hook ──
  const useCounter = (target: number, suffix = '') => {
    const ref = useRef<HTMLSpanElement>(null)
    const counted = useRef(false)

    useEffect(() => {
      if (!ref.current) return
      const io = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting || counted.current) return
        counted.current = true
        const start = performance.now()
        const duration = 1800
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1)
          const ease = 1 - Math.pow(1 - t, 4) // easeOutQuart
          if (ref.current) ref.current.textContent = Math.floor(ease * target) + suffix
          if (t < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }, { threshold: 0.5 })
      io.observe(ref.current)
      return () => io.disconnect()
    }, [target, suffix])

    return ref
  }

  const stat1 = useCounter(95, '%')
  const stat2 = useCounter(27, '')
  const stat3 = useCounter(90, '')

  // ── accordion toggle ──
  const toggleLayer = useCallback((i: number) => {
    setOpenLayer(prev => prev === i ? null : i)
  }, [])

  // ── data ──
  const layers = [
    {
      num: '01',
      title: 'Dream Engine',
      subtitle: 'Idea Intelligence',
      body: 'Extracts product opportunities from raw frustrations. Runs structured scoring across market size, founder-market fit, competition density, and monetization clarity before a single line of code.',
    },
    {
      num: '02',
      title: 'The Architect',
      subtitle: 'Roadmap & Strategy',
      body: 'Generates a 90-day founder roadmap broken into validation, MVP, and first-revenue phases. Each day has one goal, three tasks, a success metric, and automatic re-planning when reality shifts.',
    },
    {
      num: '03',
      title: 'Executor Pack',
      subtitle: 'Agents That Ship',
      body: 'Ten specialized agents handle code generation, cold outreach, content writing, sales scripts, financial modeling, and legal drafts. They commit to GitHub, deploy to Vercel, and track Stripe metrics — autonomously.',
    },
    {
      num: '04',
      title: 'The Compass',
      subtitle: 'Coaching & Accountability',
      body: 'Daily 90-second standups, weekly debriefs, a real-time momentum score, and an anti-delusion mirror that challenges assumptions before they become expensive mistakes.',
    },
    {
      num: '05',
      title: 'Mission Control',
      subtitle: 'Platform & Memory',
      body: 'Persistent context across all agents and sessions. Chain workflows with one instruction. Encrypted vault for API keys, contracts, and financial models. One dashboard for everything.',
    },
  ]

  const agents = [
    { name: 'Builder', role: 'Scaffolds full-stack codebases, commits to GitHub, deploys to Vercel and Railway without human intervention.' },
    { name: 'Outreach', role: 'Writes personalized cold emails and LinkedIn messages in your voice. Manages follow-up sequences and tracks open rates.' },
    { name: 'Content & SEO', role: 'Generates keyword maps, blog calendars, Twitter threads, and programmatic SEO pages aligned to your ICP.' },
    { name: 'Sales', role: 'Prepares discovery call scripts, drafts proposals, and maintains a lightweight CRM with lead status tracking.' },
    { name: 'Financial', role: 'Builds 12-month P&L models, calculates runway and LTV:CAC ratios, runs scenario analysis, generates investor slides.' },
    { name: 'Coaching', role: 'Triggers daily standups, tracks momentum streaks, challenges delays, and delivers honest founder feedback.' },
  ]

  const plans = [
    {
      name: 'Starter',
      price: '29',
      interval: 'mo',
      desc: 'Validate ideas with structured intelligence.',
      features: ['Dream Engine access', '90-day roadmap builder', '2 execution agents', 'Cross-agent memory', 'Weekly email reports'],
      cta: 'Start free',
      highlighted: false,
    },
    {
      name: 'Builder',
      price: '79',
      interval: 'mo',
      desc: 'Build and deploy autonomously.',
      features: ['Everything in Starter', 'All 10 execution agents', 'Auto-deploy pipelines', '500 agent tasks / mo', 'Compass accountability', 'Stripe & PostHog integrations'],
      cta: 'Start free',
      highlighted: false,
    },
    {
      name: 'Founder',
      price: '149',
      interval: 'mo',
      desc: 'The full autonomous executive board.',
      features: ['Everything in Builder', 'Fundraising agents', 'Legal & compliance drafts', 'Unlimited agent tasks', 'Background iterations', 'Priority onboarding'],
      cta: 'Start free',
      highlighted: true,
    },
    {
      name: 'Studio',
      price: '299',
      interval: 'mo',
      desc: 'Multi-project operator workspace.',
      features: ['Everything in Founder', 'Up to 5 projects', 'Shared memory across projects', 'Team delegation seats', 'White-label reports', 'Dedicated compute'],
      cta: 'Start free',
      highlighted: false,
    },
  ]

  return (
    <div className="min-h-screen bg-[#050505] text-[#e5e5e5] font-sans">

      {/* ═══════ NAV ═══════ */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${navSolid ? 'bg-[#050505]/90 backdrop-blur-sm border-b border-[#1a1a1a]' : 'bg-transparent border-b border-transparent'}`}>
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#" className="font-display font-bold text-[18px] tracking-[-0.02em] text-white">
            Karnex
          </a>

          <div className="hidden md:flex items-center gap-10">
            <a href="#architecture" className="text-[13px] text-[#a1a1a1] hover:text-white transition-colors link-hover">Architecture</a>
            <a href="#agents" className="text-[13px] text-[#a1a1a1] hover:text-white transition-colors link-hover">Agents</a>
            <a href="#pricing" className="text-[13px] text-[#a1a1a1] hover:text-white transition-colors link-hover">Pricing</a>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <a href="/login" className="text-[13px] text-[#a1a1a1] hover:text-white transition-colors">Log in</a>
            <a href="/signup" className="text-[13px] font-medium text-white bg-[#6366f1] hover:bg-[#5558e6] px-4 py-2 rounded-lg transition-colors">
              Get started
            </a>
          </div>

          <button onClick={() => setMobileNav(!mobileNav)} className="md:hidden text-[#a1a1a1] hover:text-white cursor-pointer" aria-label="Menu">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              {mobileNav
                ? <path d="M5 5l10 10M15 5L5 15" />
                : <><path d="M3 6h14" /><path d="M3 10h14" /><path d="M3 14h14" /></>}
            </svg>
          </button>
        </div>

        {mobileNav && (
          <div className="md:hidden bg-[#050505] border-t border-[#1a1a1a] px-6 py-8 flex flex-col gap-6">
            <a href="#architecture" onClick={() => setMobileNav(false)} className="text-[15px] text-[#a1a1a1] hover:text-white">Architecture</a>
            <a href="#agents" onClick={() => setMobileNav(false)} className="text-[15px] text-[#a1a1a1] hover:text-white">Agents</a>
            <a href="#pricing" onClick={() => setMobileNav(false)} className="text-[15px] text-[#a1a1a1] hover:text-white">Pricing</a>
            <hr className="border-[#1a1a1a]" />
            <a href="/login" className="text-[15px] text-[#a1a1a1]">Log in</a>
            <a href="/signup" className="text-[15px] font-medium text-center text-white bg-[#6366f1] py-3 rounded-lg">Get started</a>
          </div>
        )}
      </nav>

      {/* ═══════ HERO — immersive video background ═══════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden border-b border-[#1a1a1a]">
        {/* Background Video */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
          <video autoPlay muted loop playsInline className="w-full h-full object-cover opacity-60">
            <source src="/videos/hero-bg.mov" type="video/quicktime" />
            <source src="/videos/hero-bg.mov" type="video/mp4" />
          </video>
          {/* Subtle overlays for maximum text legibility & smooth gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/75 via-transparent to-[#050505]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/40 via-transparent to-[#050505]/40" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-[800px] mx-auto px-6 text-center py-32 mt-16">
          <p className="reveal text-[13px] font-medium tracking-[0.08em] uppercase text-[#6366f1] mb-6">
            AI Co-Founder Platform
          </p>

          <h1 className="reveal font-display font-bold text-[clamp(44px,7vw,84px)] leading-[1.05] tracking-[-0.03em] text-white mb-8" style={{ transitionDelay: '80ms' }}>
            Stop advising.<br />
            Start shipping.
          </h1>

          <p className="reveal text-[17px] md:text-[18px] leading-[1.75] text-[#a1a1a1] max-w-[560px] mx-auto mb-10" style={{ transitionDelay: '160ms' }}>
            Karnex deploys 27 specialized AI agents that execute code, outreach, content, sales, and financial modeling in parallel. From raw idea to first revenue in 90 days.
          </p>

          <div className="reveal flex flex-wrap items-center justify-center gap-6" style={{ transitionDelay: '240ms' }}>
            <a
              href="/signup"
              className="inline-flex items-center gap-2 text-[14px] font-medium text-white bg-[#6366f1] hover:bg-[#5558e6] px-6 py-3.5 rounded-lg transition-colors shadow-lg shadow-[#6366f1]/10"
            >
              Get started free
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 7h12m-5-5 5 5-5 5"/></svg>
            </a>
            <a
              href="#architecture"
              className="text-[14px] font-medium text-[#a1a1a1] hover:text-white transition-colors"
            >
              See how it works →
            </a>
          </div>
        </div>
      </section>

      {/* ═══════ NUMBERS — inline, not in cards ═══════ */}
      <section className="py-16 border-y border-[#1a1a1a]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-0 sm:divide-x sm:divide-[#1a1a1a]">
            {[
              { ref: stat1, init: '0%', label: 'of solo projects fail in year one' },
              { ref: stat2, init: '0', label: 'specialized agents working in parallel' },
              { ref: stat3, init: '0', label: 'days from concept to first revenue' },
            ].map((s, i) => (
              <div key={i} className="reveal sm:px-10 first:sm:pl-0 last:sm:pr-0 text-center sm:text-left" style={{ transitionDelay: `${i * 100}ms` }}>
                <span ref={s.ref} className="font-display font-bold text-[48px] tracking-[-0.04em] text-white">
                  {s.init}
                </span>
                <p className="text-[14px] text-[#737373] mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ MANIFESTO — one big line ═══════ */}
      <section className="py-28 md:py-40">
        <div className="max-w-[900px] mx-auto px-6">
          <h2 className="reveal font-display font-bold text-[clamp(28px,4.5vw,52px)] leading-[1.2] tracking-[-0.025em] text-white text-center">
            Solo founders don&apos;t fail because of bad ideas. They fail because building a startup requires an entire team — and they&apos;re one person.
          </h2>
          <p className="reveal text-[17px] text-[#737373] text-center mt-8 max-w-[600px] mx-auto" style={{ transitionDelay: '100ms' }}>
            Karnex is not a chatbot. It&apos;s the operating system that executes every function of a founding team, so you can build alone without being alone.
          </p>
        </div>
      </section>

      {/* ═══════ ARCHITECTURE — accordion ═══════ */}
      <section id="architecture" className="py-20 md:py-32 border-t border-[#1a1a1a]">
        <div className="max-w-[1200px] mx-auto px-6">

          <div className="grid lg:grid-cols-12 gap-16 lg:gap-20">

            {/* Left column: heading + video */}
            <div className="lg:col-span-5">
              <p className="reveal text-[13px] font-medium tracking-[0.08em] uppercase text-[#6366f1] mb-4">Architecture</p>
              <h2 className="reveal font-display font-bold text-[clamp(28px,3.5vw,42px)] leading-[1.15] tracking-[-0.025em] text-white mb-6" style={{ transitionDelay: '80ms' }}>
                Five layers.<br />One system.
              </h2>
              <p className="reveal text-[16px] leading-[1.7] text-[#a1a1a1] mb-10" style={{ transitionDelay: '140ms' }}>
                Each layer builds on the one below it — from validating an idea to scaling revenue. They share memory, context, and decisions.
              </p>

              <div className="reveal video-frame aspect-video" style={{ transitionDelay: '200ms' }}>
                <video autoPlay muted loop playsInline>
                  <source src="/videos/features-bg.mov" type="video/quicktime" />
                  <source src="/videos/features-bg.mov" type="video/mp4" />
                </video>
              </div>
            </div>

            {/* Right column: accordion */}
            <div className="lg:col-span-7">
              <div className="divide-y divide-[#1a1a1a] border-y border-[#1a1a1a]">
                {layers.map((layer, i) => (
                  <div key={i} className="reveal" style={{ transitionDelay: `${i * 60}ms` }}>
                    <button
                      onClick={() => toggleLayer(i)}
                      className="w-full flex items-center gap-6 py-6 text-left group cursor-pointer"
                    >
                      <span className="text-[13px] font-mono text-[#525252] group-hover:text-[#6366f1] transition-colors shrink-0">
                        {layer.num}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold text-[18px] text-white group-hover:text-white transition-colors">
                          {layer.title}
                        </h3>
                        <span className="text-[13px] text-[#525252]">{layer.subtitle}</span>
                      </div>
                      <svg
                        width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                        className={`shrink-0 text-[#525252] transition-transform duration-300 ${openLayer === i ? 'rotate-45' : ''}`}
                      >
                        <path d="M8 3v10M3 8h10" />
                      </svg>
                    </button>

                    <div className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${openLayer === i ? 'max-h-[200px] opacity-100 pb-6' : 'max-h-0 opacity-0'}`}>
                      <p className="text-[15px] leading-[1.7] text-[#a1a1a1] pl-[52px] pr-4">
                        {layer.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ AGENTS — clean grid ═══════ */}
      <section id="agents" className="py-20 md:py-32 border-t border-[#1a1a1a]">
        <div className="max-w-[1200px] mx-auto px-6">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <p className="reveal text-[13px] font-medium tracking-[0.08em] uppercase text-[#6366f1] mb-4">Agents</p>
              <h2 className="reveal font-display font-bold text-[clamp(28px,3.5vw,42px)] leading-[1.15] tracking-[-0.025em] text-white" style={{ transitionDelay: '80ms' }}>
                Your execution team.
              </h2>
            </div>
            <p className="reveal text-[15px] text-[#737373] max-w-[380px] md:text-right" style={{ transitionDelay: '120ms' }}>
              Each agent is trained for a specific startup function. They coordinate context and hand off work automatically.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#1a1a1a] border border-[#1a1a1a] rounded-2xl overflow-hidden">
            {agents.map((agent, i) => (
              <div
                key={i}
                className="reveal bg-[#050505] p-8 hover:bg-[#0a0a0a] transition-colors group"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#6366f1] opacity-60 group-hover:opacity-100 transition-opacity" />
                  <h3 className="font-display font-semibold text-[16px] text-white">
                    {agent.name}
                  </h3>
                </div>
                <p className="text-[14px] leading-[1.65] text-[#737373]">
                  {agent.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ JOURNEY — three phases ═══════ */}
      <section className="py-20 md:py-32 border-t border-[#1a1a1a]">
        <div className="max-w-[1200px] mx-auto px-6">

          <p className="reveal text-[13px] font-medium tracking-[0.08em] uppercase text-[#6366f1] mb-4">The 90-day plan</p>
          <h2 className="reveal font-display font-bold text-[clamp(28px,3.5vw,42px)] leading-[1.15] tracking-[-0.025em] text-white mb-16" style={{ transitionDelay: '80ms' }}>
            Concept → Product → Revenue
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                phase: '01',
                days: 'Days 1–30',
                title: 'Validate',
                body: 'Extract product opportunities from lived experience. Score ideas across six dimensions. Build a competitor map. Define your sharpest ICP. Launch a landing page and run first outreach.',
              },
              {
                phase: '02',
                days: 'Days 31–60',
                title: 'Build',
                body: 'Scaffold the database, auth, payments, and core product views. The Builder Agent commits directly to GitHub and deploys to production. Run automated tests continuously.',
              },
              {
                phase: '03',
                days: 'Days 61–90',
                title: 'Monetize',
                body: 'Content agents run the SEO calendar. Outreach agents capture leads. Sales agents prepare call scripts and proposals. Analytics tracks conversion and churn signals in real-time.',
              },
            ].map((step, i) => (
              <div
                key={i}
                className="reveal border border-[#1a1a1a] rounded-2xl p-8 hover:border-[#262626] transition-colors"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-6">
                  <span className="font-display font-bold text-[52px] tracking-[-0.04em] text-[#1a1a1a]">
                    {step.phase}
                  </span>
                  <span className="text-[12px] font-medium tracking-[0.06em] uppercase text-[#525252]">
                    {step.days}
                  </span>
                </div>
                <h3 className="font-display font-semibold text-[20px] text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-[14px] leading-[1.7] text-[#737373]">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ PRICING ═══════ */}
      <section id="pricing" className="py-20 md:py-32 border-t border-[#1a1a1a]">
        <div className="max-w-[1200px] mx-auto px-6">

          <div className="text-center mb-16">
            <p className="reveal text-[13px] font-medium tracking-[0.08em] uppercase text-[#6366f1] mb-4">Pricing</p>
            <h2 className="reveal font-display font-bold text-[clamp(28px,3.5vw,42px)] leading-[1.15] tracking-[-0.025em] text-white" style={{ transitionDelay: '80ms' }}>
              Simple, transparent plans.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`reveal rounded-2xl p-8 flex flex-col border transition-colors ${
                  plan.highlighted
                    ? 'border-[#6366f1]/40 bg-[#6366f1]/[0.04]'
                    : 'border-[#1a1a1a] hover:border-[#262626] bg-transparent'
                }`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="font-display font-semibold text-[18px] text-white">{plan.name}</h3>
                    {plan.highlighted && (
                      <span className="text-[11px] font-medium tracking-[0.05em] uppercase text-[#6366f1] bg-[#6366f1]/10 px-2 py-0.5 rounded">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="font-display font-bold text-[40px] tracking-[-0.03em] text-white">${plan.price}</span>
                    <span className="text-[14px] text-[#525252]">/{plan.interval}</span>
                  </div>
                  <p className="text-[14px] text-[#737373] leading-[1.5]">{plan.desc}</p>
                </div>

                <hr className="border-[#1a1a1a] mb-6" />

                <ul className="flex-1 space-y-3 mb-8">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-3">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-[3px]">
                        <path d="M3 7.5l2.5 2.5L11 4" stroke={plan.highlighted ? '#6366f1' : '#525252'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-[13px] text-[#a1a1a1] leading-[1.5]">{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={`/signup?plan=${plan.name.toLowerCase()}`}
                  className={`block text-center text-[13px] font-medium py-3 rounded-lg transition-colors ${
                    plan.highlighted
                      ? 'bg-[#6366f1] hover:bg-[#5558e6] text-white'
                      : 'border border-[#262626] hover:border-[#404040] text-[#a1a1a1] hover:text-white'
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ CTA — video background ═══════ */}
      <section className="relative py-28 md:py-40 border-t border-[#1a1a1a] overflow-hidden">
        <div className="absolute inset-0">
          <video autoPlay muted loop playsInline className="w-full h-full object-cover opacity-15">
            <source src="/videos/cta-bg.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="relative z-10 max-w-[700px] mx-auto px-6 text-center">
          <h2 className="reveal font-display font-bold text-[clamp(28px,4.5vw,52px)] leading-[1.15] tracking-[-0.025em] text-white mb-6">
            Your startup shouldn&apos;t die because you&apos;re one person.
          </h2>
          <p className="reveal text-[17px] text-[#737373] mb-10" style={{ transitionDelay: '80ms' }}>
            Start with the idea. Karnex handles the rest.
          </p>
          <div className="reveal" style={{ transitionDelay: '160ms' }}>
            <a
              href="/signup"
              className="inline-flex items-center gap-2 text-[14px] font-medium text-white bg-[#6366f1] hover:bg-[#5558e6] px-6 py-3 rounded-lg transition-colors"
            >
              Get started free
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 7h12m-5-5 5 5-5 5"/></svg>
            </a>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-[#1a1a1a] py-16">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
            <div className="col-span-2 md:col-span-1">
              <span className="font-display font-bold text-[16px] text-white">Karnex</span>
              <p className="text-[13px] text-[#525252] mt-3 leading-[1.6] max-w-[220px]">
                The AI co-founder for solo founders who refuse to quit.
              </p>
            </div>

            {[
              { heading: 'Product', links: ['Architecture', 'Agents', 'Pricing', 'Changelog'] },
              { heading: 'Resources', links: ['Documentation', 'API Reference', 'Status', 'Blog'] },
              { heading: 'Company', links: ['About', 'Privacy', 'Terms', 'Contact'] },
            ].map((col, ci) => (
              <div key={ci}>
                <h4 className="text-[12px] font-medium tracking-[0.06em] uppercase text-[#525252] mb-4">{col.heading}</h4>
                <ul className="space-y-3">
                  {col.links.map((link, li) => (
                    <li key={li}>
                      <a href="#" className="text-[13px] text-[#737373] hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <hr className="border-[#1a1a1a] mb-8" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-[#525252]">
              © {new Date().getFullYear()} Karnex Inc.
            </p>
            <div className="flex items-center gap-5">
              {[
                { label: 'X', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                { label: 'GitHub', path: 'M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z' },
              ].map((icon, ii) => (
                <a key={ii} href="#" className="text-[#525252] hover:text-white transition-colors" aria-label={icon.label}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={icon.path} /></svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
