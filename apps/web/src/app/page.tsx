'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Terminal,
  Share2,
  Lock,
  Sliders,
  LayoutDashboard,
  ArrowLeft,
  ArrowUpRight,
  Search,
  CheckCircle,
  Play,
  Settings as SettingsIcon,
  AlertCircle,
  Cpu,
  GitBranch,
  Code,
  RefreshCw,
  Send,
  Check,
  Eye,
  HelpCircle,
  HardDrive,
  Shield,
  Key,
  Globe,
  Database,
  BarChart,
  Mail,
  Zap,
  Activity,
  FileText
} from 'lucide-react'

// Custom SVG Github icon to avoid dependency issues
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

// Mock Data for Vault
const MOCK_VAULT_FILES = [
  { id: '1', name: 'auth_handler.ts', type: 'TypeScript', agent: 'Builder Agent', size: '2.4 KB', date: '2026-06-07 10:14' },
  { id: '2', name: 'schema.sql', type: 'SQL DDL', agent: 'Builder Agent', size: '14.2 KB', date: '2026-06-07 10:02' },
  { id: '3', name: 'pitch_deck_v2.pdf', type: 'PDF Document', agent: 'Financial Agent', size: '4.8 MB', date: '2026-06-06 17:30' },
  { id: '4', name: 'cold_outreach_leads.csv', type: 'CSV Data', agent: 'Outreach Agent', size: '120 KB', date: '2026-06-06 14:15' },
  { id: '5', name: 'weekly_standup_log_06_05.md', type: 'Markdown', agent: 'Coaching Agent', size: '1.8 KB', date: '2026-06-05 09:00' },
  { id: '6', name: 'runway_model_xlsx', type: 'Spreadsheet', agent: 'Financial Agent', size: '1.1 MB', date: '2026-06-04 18:22' },
  { id: '7', name: 'sitemap_programmatic.xml', type: 'XML Sitemap', agent: 'SEO Agent', size: '5.6 KB', date: '2026-06-04 12:45' },
]

export default function UnifiedApp() {
  // Navigation State: 'landing' | 'dashboard' | 'studio' | 'integrations' | 'vault' | 'settings'
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard' | 'studio' | 'integrations' | 'vault' | 'settings'>('landing')
  
  // Landing Page Interactive States
  const [architectureStep, setArchitectureStep] = useState(0)
  
  // Terminal log streaming simulation for Landing Page Hero
  const [heroLogs, setHeroLogs] = useState<string[]>([
    'karnex-init: initializing swarm...',
    '[core] primary memory established via persistent context',
    '[builder] info: scaffold command received for NextJS Fullstack',
  ])
  
  // Simulation log streaming index
  useEffect(() => {
    if (currentView !== 'landing') return
    const logsSequence = [
      '[builder] success: created repository github.com/karnex/saas-core',
      '[builder] info: configuring auth (Supabase Integration)',
      '[outreach] task: drafting launch campaign targeted at 500 ICPs',
      '[seo] info: scraping top 20 keywords for "ai agent platform"',
      '[builder] success: database migrations executed successfully',
      '[financial] info: calculating 12-month runway projection...',
      '[coaching] standup: checking sprint velocity, momentum is 94%',
      '[core] success: production deployment live at vercel.app/karnex-saas',
    ]
    let index = 0
    const interval = setInterval(() => {
      setHeroLogs((prev) => {
        const next = [...prev, logsSequence[index]]
        if (next.length > 8) next.shift() // keep standard size
        return next
      })
      index = (index + 1) % logsSequence.length
    }, 2500)
    return () => clearInterval(interval)
  }, [currentView])

  // Studio Interactive States
  const [studioInput, setStudioInput] = useState('')
  const [studioMessages, setStudioMessages] = useState<Array<{ sender: 'user' | 'builder'; text: string; time: string }>>([
    {
      sender: 'builder',
      text: "I am ready. Tell me what feature to implement, and I will write the code, commit to GitHub, and deploy.",
      time: '13:26'
    }
  ])
  const [studioLogs, setStudioLogs] = useState<string[]>([
    'SYSTEM: Studio Sandbox initialized. Mode set to developer.',
    'BUILDER: Repository git@github.com:karnex/project-x.git is active.',
    'BUILDER: Vercel project connected. Ready to deploy branches.',
  ])
  const [isDeploying, setIsDeploying] = useState(false)
  const terminalEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'auto' })
    }
  }, [studioLogs])

  // Integrations interactive hover state
  const [hoveredIntegration, setHoveredIntegration] = useState<string | null>(null)

  // Vault Table Filter State
  const [vaultSearch, setVaultSearch] = useState('')
  const filteredVaultFiles = MOCK_VAULT_FILES.filter(
    (file) =>
      file.name.toLowerCase().includes(vaultSearch.toLowerCase()) ||
      file.agent.toLowerCase().includes(vaultSearch.toLowerCase()) ||
      file.type.toLowerCase().includes(vaultSearch.toLowerCase())
  )

  // Settings State
  const [settingsTechLevel, setSettingsTechLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [settingsSpeed, setSettingsSpeed] = useState<'fast' | 'balanced' | 'max'>('balanced')
  const [settingsToggles, setSettingsToggles] = useState({
    proactiveScan: true,
    autoRotate: true,
    telemetry: false,
    verboseLogs: true,
  })

  // Handle building feature in Studio
  const handleStudioSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!studioInput.trim()) return
    const input = studioInput
    setStudioInput('')
    
    // Add user message
    setStudioMessages((prev) => [...prev, { sender: 'user', text: input, time: '13:28' }])
    
    // Append terminal logs showing execution
    setTimeout(() => {
      setStudioLogs((prev) => [...prev, `[user] command: ${input}`])
    }, 100)

    setTimeout(() => {
      setStudioLogs((prev) => [...prev, `[builder] analyzing spec, checking database schemas...`])
    }, 500)

    setTimeout(() => {
      setStudioLogs((prev) => [...prev, `[builder] editing files: src/app/api/checkout/route.ts, src/components/Payment.tsx`])
    }, 1000)

    setTimeout(() => {
      setStudioLogs((prev) => [...prev, `[builder] running tests: npm run test...`])
    }, 1600)

    setTimeout(() => {
      setStudioLogs((prev) => [...prev, `[builder] success: all 4 unit tests passed.`])
    }, 2200)

    setTimeout(() => {
      setStudioLogs((prev) => [...prev, `[builder] pushing commits to origin/main...`])
      setStudioMessages((prev) => [
        ...prev,
        {
          sender: 'builder',
          text: `Done. I've implemented the billing checkout routing, verified local testing, and pushed to your repo. Ready to deploy.`,
          time: '13:29'
        }
      ])
    }, 2800)
  }

  // Simulate deploying to Vercel
  const runMockDeploy = () => {
    if (isDeploying) return
    setIsDeploying(true)
    setStudioLogs((prev) => [...prev, `[system] launching Vercel deployment pipeline...`])
    
    setTimeout(() => {
      setStudioLogs((prev) => [...prev, `[vercel] fetching deployment source files...`])
    }, 400)
    setTimeout(() => {
      setStudioLogs((prev) => [...prev, `[vercel] building project: next build...`])
    }, 1000)
    setTimeout(() => {
      setStudioLogs((prev) => [...prev, `[vercel] compiled client and server pages successfully.`])
    }, 1800)
    setTimeout(() => {
      setStudioLogs((prev) => [
        ...prev,
        `[vercel] deployment live at: https://karnex-project-x.vercel.app`,
        `[system] deployment completed successfully. URL updated.`
      ])
      setIsDeploying(false)
    }, 2600)
  }

  // Raw Agent UI outputs mapping for Architecture section
  const ARCHITECTURE_OUTPUTS = [
    {
      title: 'Dream Engine',
      lang: 'json',
      code: `{
  "opportunity_id": "opp_9182a",
  "score": 9.4,
  "metrics": {
    "Founder-Market Fit": "Strong (10/10)",
    "Monetization Potential": "SaaS / High (9/10)",
    "Competition Density": "Low-Medium (8/10)"
  },
  "recommendation": "PROCEED TO ARCHITECTING"
}`
    },
    {
      title: 'The Architect',
      lang: 'yaml',
      code: `roadmap:
  milestones:
    - Phase 1: Authentication & Supabase Schema (Days 1-15)
    - Phase 2: Core Workspace Sandbox (Days 16-45)
    - Phase 3: Stripe Subscriptions & Billing (Days 46-60)
  current_velocity: 1.4x
  status: ON_TRACK`
    },
    {
      title: 'Executor Pack',
      lang: 'bash',
      code: `$ git status
On branch main
Your branch is up to date with 'origin/main'.

Changes to be committed:
  new file:   src/app/api/auth/route.ts
  new file:   src/components/studio/Preview.tsx

$ npm run test -- --passWithNoTests
PASS  src/tests/auth.test.ts (4.82 s)`
    },
    {
      title: 'The Compass',
      lang: 'text',
      code: `[Compass Log - 13:42:01]
Daily Standup Complete.
Streak: 12 days active.
Momentum Score: 92%
Alert: Builder Agent detected API key expiration.
Feedback: "You are committing 30% faster this week. Keep shipping."`
    },
    {
      title: 'Mission Control',
      lang: 'text',
      code: `Vault Status: SECURE
Active Credentials: 8/8
Persistent Context Size: 412 KB (Vector Index Optimized)
Cross-Agent Channel: CONNECTED
Active Runs: None (All systems standby)`
    }
  ]

  // Render Marketing Landing Page
  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#fafafa] font-sans selection:bg-[#ff4400]/30 selection:text-white">
        
        {/* Nav */}
        <nav className="fixed top-0 inset-x-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/10 h-16">
          <div className="max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between">
            <a href="#" className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-[#ff4400]"></span>
              <span className="font-display font-bold text-lg tracking-tight text-[#fafafa]">
                KARNEX
              </span>
            </a>

            <div className="hidden md:flex items-center gap-8">
              <a href="#architecture" className="text-xs font-semibold tracking-wider uppercase text-[#888888] hover:text-[#fafafa] transition-colors">Architecture</a>
              <a href="#agents" className="text-xs font-semibold tracking-wider uppercase text-[#888888] hover:text-[#fafafa] transition-colors">Agents</a>
              <a href="#pricing" className="text-xs font-semibold tracking-wider uppercase text-[#888888] hover:text-[#fafafa] transition-colors">Pricing</a>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentView('dashboard')}
                className="text-xs font-semibold tracking-wider uppercase text-[#888888] hover:text-[#fafafa] transition-colors px-3 py-1.5"
              >
                Log in
              </button>
              <button 
                onClick={() => setCurrentView('studio')}
                className="dash-btn dash-btn-primary py-1.5 px-4"
              >
                Launch App
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden border-b border-white/10 pt-20 forge-grid-bg">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/50 to-[#0a0a0a]" />
          
          <div className="relative z-10 max-w-[1200px] mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center w-full py-20">
            
            {/* Hero Text */}
            <div className="space-y-8">
              <span className="inline-flex items-center gap-2 px-3 py-1 border border-white/10 bg-[#111111] text-[11px] font-mono tracking-widest text-[#ff4400]">
                STATUS: PRODUCTION READY
              </span>

              <h1 className="font-display font-extrabold text-5xl md:text-7xl leading-[1.02] tracking-tighter text-[#fafafa]">
                Stop advising.<br />
                Start shipping.
              </h1>

              <p className="text-[#888888] text-base md:text-lg leading-relaxed max-w-[480px]">
                Karnex deploys 27 specialized AI agents executing database migration, cold sales pipelines, SEO content, and codebase architecture in parallel. From raw idea to first revenue in 90 days.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => setCurrentView('studio')}
                  className="dash-btn dash-btn-primary px-6 py-3 font-semibold text-sm flex items-center gap-2"
                >
                  Enter Developer Studio
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="dash-btn dash-btn-secondary px-6 py-3 font-semibold text-sm hover:border-[#ff4400]/30"
                >
                  View Live Dashboard
                </button>
              </div>
            </div>

            {/* Code / Terminal Window */}
            <div className="border border-white/10 bg-[#111111] p-4 flex flex-col font-mono text-[12px] h-[340px] relative w-full overflow-hidden shadow-2xl">
              {/* Terminal Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff4400]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700"></span>
                </div>
                <span className="text-[10px] text-zinc-600 tracking-wider">KARNEX_CORE_AGENT_RUNNER</span>
              </div>

              {/* Streaming Logs */}
              <div className="flex-1 flex flex-col justify-end space-y-2 overflow-hidden text-zinc-400">
                {heroLogs.map((log, i) => {
                  let colorClass = 'text-zinc-400'
                  if (log.startsWith('[core]')) colorClass = 'text-[#ff4400] font-semibold'
                  else if (log.includes('success:')) colorClass = 'text-emerald-400'
                  else if (log.includes('task:')) colorClass = 'text-amber-400'
                  return (
                    <div key={i} className={`leading-relaxed border-l-2 border-white/5 pl-2 ${colorClass}`}>
                      {log}
                    </div>
                  )
                })}
                <div className="pt-1">
                  <span className="text-[#ff4400] font-semibold">karnex-runner:~#</span>
                  <span className="prompt-cursor"></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Timeline Section (Architecture) */}
        <section id="architecture" className="py-32 border-b border-white/10 bg-[#0c0c0c]">
          <div className="max-w-[1200px] mx-auto px-6">
            
            <div className="max-w-[600px] mb-20 space-y-4">
              <span className="text-xs font-mono font-bold tracking-widest text-[#ff4400] uppercase">System Design</span>
              <h2 className="font-display font-extrabold text-3xl md:text-5xl tracking-tighter text-[#fafafa]">
                Five autonomous layers.<br />One execution core.
              </h2>
              <p className="text-[#888888] text-sm md:text-base">
                Each layer builds on the one below it, sharing persistent state and execution contexts without human overhead.
              </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-12 items-start">
              
              {/* Native Scrolling / Interactive steps list */}
              <div className="lg:col-span-5 space-y-3">
                {[
                  { num: '01', title: 'Dream Engine', desc: 'Sift through opportunities. Structurally grades founder fit, market depth, and monetization models.' },
                  { num: '02', title: 'The Architect', desc: 'Compiles technical blueprints and a 90-day task-oriented roadmap that continuously self-corrects.' },
                  { num: '03', title: 'Executor Pack', desc: 'Deploying engineering, SEO calendar, and outbound outreach campaigns simultaneously.' },
                  { num: '04', title: 'The Compass', desc: 'Daily automated stands and milestone checks. Direct accountabilities to prevent startup drift.' },
                  { num: '05', title: 'Mission Control', desc: 'Secure database vault hosting access credentials, workspace APIs, and unified context indexes.' },
                ].map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => setArchitectureStep(idx)}
                    className={`w-full text-left p-6 border transition-all duration-100 flex items-start gap-4 ${
                      architectureStep === idx
                        ? 'border-[#ff4400] bg-[#111111]'
                        : 'border-white/5 bg-transparent hover:border-white/10 hover:bg-[#111111]/30'
                    }`}
                  >
                    <span className={`font-mono text-xs font-bold ${architectureStep === idx ? 'text-[#ff4400]' : 'text-zinc-600'}`}>
                      {step.num}
                    </span>
                    <div className="space-y-2">
                      <h3 className="font-display font-bold text-sm text-[#fafafa]">{step.title}</h3>
                      <p className="text-[#888888] text-[12px] leading-relaxed">{step.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Live Output Terminal Screen */}
              <div className="lg:col-span-7 border border-white/10 bg-[#111111] p-5 h-[420px] flex flex-col font-mono text-[12px] shadow-xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ff4400]"></div>
                    <span className="text-zinc-400 font-bold text-[10px]">
                      {ARCHITECTURE_OUTPUTS[architectureStep].title} Output
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-600">
                    FORMAT: {ARCHITECTURE_OUTPUTS[architectureStep].lang.toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto whitespace-pre-wrap text-zinc-300 select-all font-mono leading-relaxed">
                  {ARCHITECTURE_OUTPUTS[architectureStep].code}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Agents Grid (Asymmetrical ID Cards) */}
        <section id="agents" className="py-32 border-b border-white/10">
          <div className="max-w-[1200px] mx-auto px-6">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-20">
              <div className="space-y-4">
                <span className="text-xs font-mono font-bold tracking-widest text-[#ff4400] uppercase">The Swarm</span>
                <h2 className="font-display font-extrabold text-3xl md:text-5xl tracking-tighter text-[#fafafa]">
                  Your startup board.
                </h2>
              </div>
              <p className="text-[#888888] text-sm md:text-base max-w-[360px]">
                Highly targeted specialized agents coordinating tasks continuously, handing off workloads automatically.
              </p>
            </div>

            {/* Asymmetrical Masonry Layout of Agent ID Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Builder Agent - Double Width */}
              <div className="lg:col-span-2 border border-white/10 bg-[#111111] p-8 flex flex-col justify-between h-[300px] hover:border-[#ff4400]/30 transition-all duration-100 relative group overflow-hidden">
                <div className="absolute top-0 right-0 p-3 bg-white/5 font-mono text-[9px] text-zinc-500 tracking-wider">ID: 01_BUILDER</div>
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-[#ff4400]/10 text-[#ff4400] rounded-sm">
                      <Code className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="font-display font-extrabold text-base text-[#fafafa] tracking-tight">Builder Core Agent</h3>
                      <span className="font-mono text-[10px] text-emerald-400 font-medium">STATUS: ACTIVE / DEPLOYING</span>
                    </div>
                  </div>
                  <p className="text-[#888888] text-xs leading-relaxed max-w-[480px]">
                    Reads specs, scaffolds architecture structures, constructs database migrations, pushes semantic git branches, runs unit tests, and integrates API gateways. Deploys to live environments autonomously.
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-4 font-mono text-[10px] text-zinc-500">
                  <span>METRIC: 412 deploys</span>
                  <span>SUCCESS RATE: 99.4%</span>
                </div>
              </div>

              {/* Outreach Agent */}
              <div className="border border-white/10 bg-[#111111] p-8 flex flex-col justify-between h-[300px] hover:border-[#ff4400]/30 transition-all duration-100 relative group">
                <div className="absolute top-0 right-0 p-3 bg-white/5 font-mono text-[9px] text-zinc-500 tracking-wider">ID: 02_OUTREACH</div>
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-[#ff4400]/10 text-[#ff4400] rounded-sm">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="font-display font-extrabold text-base text-[#fafafa] tracking-tight">Outreach & Sales</h3>
                      <span className="font-mono text-[10px] text-zinc-500 font-medium">STATUS: IDLE</span>
                    </div>
                  </div>
                  <p className="text-[#888888] text-xs leading-relaxed">
                    Identifies lead databases, scrapes validated contact lists, compiles customized context campaigns, runs automated follow-ups, and logs CRM statuses.
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-4 font-mono text-[10px] text-zinc-500">
                  <span>METRIC: 12k emails sent</span>
                  <span>CONV: 14.2%</span>
                </div>
              </div>

              {/* Content & SEO Agent */}
              <div className="border border-white/10 bg-[#111111] p-8 flex flex-col justify-between h-[300px] hover:border-[#ff4400]/30 transition-all duration-100 relative group">
                <div className="absolute top-0 right-0 p-3 bg-white/5 font-mono text-[9px] text-zinc-500 tracking-wider">ID: 03_SEO</div>
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-[#ff4400]/10 text-[#ff4400] rounded-sm">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="font-display font-extrabold text-base text-[#fafafa] tracking-tight">SEO & Content</h3>
                      <span className="font-mono text-[10px] text-zinc-500 font-medium">STATUS: MONITORING</span>
                    </div>
                  </div>
                  <p className="text-[#888888] text-xs leading-relaxed">
                    Performs automated keyword planning, monitors Google Search trends, creates programmatic pages, drafts documentation, and submits sitemaps.
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-4 font-mono text-[10px] text-zinc-500">
                  <span>METRIC: 180 pages indexed</span>
                  <span>TRAFFIC: +120% MoM</span>
                </div>
              </div>

              {/* Financial Agent - Double Width */}
              <div className="lg:col-span-2 border border-white/10 bg-[#111111] p-8 flex flex-col justify-between h-[300px] hover:border-[#ff4400]/30 transition-all duration-100 relative group overflow-hidden">
                <div className="absolute top-0 right-0 p-3 bg-white/5 font-mono text-[9px] text-zinc-500 tracking-wider">ID: 04_FINANCE</div>
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-[#ff4400]/10 text-[#ff4400] rounded-sm">
                      <BarChart className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="font-display font-extrabold text-base text-[#fafafa] tracking-tight">Financial Modeling</h3>
                      <span className="font-mono text-[10px] text-zinc-500 font-medium">STATUS: ANALYZING</span>
                    </div>
                  </div>
                  <p className="text-[#888888] text-xs leading-relaxed max-w-[480px]">
                    Builds multi-variable revenue projection spreadsheets, updates LTV/CAC variables, constructs interactive investor slide decks, automatically calculates Stripe payouts, and runs automated cash flow simulation metrics.
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-4 font-mono text-[10px] text-zinc-500">
                  <span>METRIC: 12 runways projected</span>
                  <span>ACCURACY: 98%</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-32 border-b border-white/10 bg-[#0c0c0c]">
          <div className="max-w-[1200px] mx-auto px-6">
            
            <div className="text-center max-w-[600px] mx-auto mb-20 space-y-4">
              <span className="text-xs font-mono font-bold tracking-widest text-[#ff4400] uppercase">Investment</span>
              <h2 className="font-display font-extrabold text-3xl md:text-5xl tracking-tighter text-[#fafafa]">
                Stark, transparent pricing.
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-[960px] mx-auto">
              {[
                { name: 'Starter', price: '29', desc: 'Ideation models, basic roadmapping, and 2 core agents.', highlight: false },
                { name: 'Builder', price: '79', desc: 'Deploying agents, live Vercel links, 10 specialized cores.', highlight: true },
                { name: 'Founder', price: '149', desc: 'Unlimited tasks, legal contracts, full financial board.', highlight: false },
              ].map((tier, idx) => (
                <div
                  key={idx}
                  className={`border p-8 flex flex-col justify-between h-[380px] bg-[#111111] ${
                    tier.highlight ? 'border-[#ff4400]' : 'border-white/10'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-extrabold text-lg text-[#fafafa]">{tier.name}</span>
                      {tier.highlight && (
                        <span className="text-[9px] font-mono font-semibold tracking-wider text-white bg-[#ff4400] px-2 py-0.5 uppercase">
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-display font-extrabold text-4xl text-[#fafafa]">${tier.price}</span>
                      <span className="text-zinc-500 font-mono text-xs">/month</span>
                    </div>
                    <p className="text-zinc-500 text-[12px] leading-relaxed">{tier.desc}</p>
                  </div>
                  
                  <button
                    onClick={() => setCurrentView('studio')}
                    className={`w-full py-2.5 text-xs font-semibold uppercase tracking-wider ${
                      tier.highlight
                        ? 'bg-[#ff4400] hover:bg-[#cc3700] text-white border border-transparent'
                        : 'border border-white/10 hover:border-white/20 text-[#fafafa]'
                    } transition-colors rounded-sm`}
                  >
                    Select Plan
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-16 bg-[#0a0a0a]">
          <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 bg-[#ff4400]"></span>
              <span className="font-mono text-xs font-bold text-[#fafafa]">KARNEX SYSTEM INC.</span>
            </div>
            <div className="flex gap-6 font-mono text-[11px] text-zinc-500">
              <a href="#" className="hover:text-[#fafafa] transition-colors">TERMINAL_DOCS</a>
              <a href="#" className="hover:text-[#fafafa] transition-colors">API_STATUS</a>
              <a href="#" className="hover:text-[#fafafa] transition-colors">CREDENTIALS_SECURITY</a>
            </div>
            <p className="font-mono text-[10px] text-zinc-600">
              © {new Date().getFullYear()} Karnex. All operations encrypted.
            </p>
          </div>
        </footer>

      </div>
    )
  }

  // Render Internal Dashboard Views
  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-[#fafafa] font-sans selection:bg-[#ff4400]/30 selection:text-white">
      
      {/* Slim Icon-Only Sidebar Navigation */}
      <aside className="w-16 shrink-0 bg-[#0a0a0a] border-r border-white/10 flex flex-col justify-between items-center py-6 z-40">
        
        {/* Core Brand Indicator */}
        <div className="flex flex-col items-center gap-6">
          <button 
            onClick={() => setCurrentView('landing')}
            className="w-8 h-8 bg-[#111111] border border-white/10 flex items-center justify-center hover:border-[#ff4400] transition-colors rounded-sm group relative"
            title="Return to Landing Page"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-[#ff4400] transition-colors" />
            <span className="absolute left-20 bg-[#111111] border border-white/10 text-[9px] font-mono text-zinc-400 px-2 py-1 uppercase tracking-wider rounded-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Back to Landing
            </span>
          </button>
          <div className="w-6 h-0.5 bg-white/5" />
        </div>

        {/* Tab Selection */}
        <nav className="flex flex-col gap-4">
          {[
            { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { view: 'studio', label: 'Developer Studio', icon: Terminal },
            { view: 'integrations', label: 'Integrations API', icon: Share2 },
            { view: 'vault', label: 'Secrets Vault', icon: Lock },
            { view: 'settings', label: 'Vercel Config', icon: Sliders },
          ].map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.view
            return (
              <button
                key={item.view}
                onClick={() => setCurrentView(item.view as any)}
                className={`w-10 h-10 flex items-center justify-center relative group transition-colors rounded-sm border ${
                  isActive
                    ? 'border-[#ff4400]/50 bg-[#111111] text-[#ff4400]'
                    : 'border-transparent text-zinc-500 hover:text-[#fafafa] hover:bg-[#111111]/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-[#ff4400]" />
                )}
                {/* Horizontal Tooltip */}
                <span className="absolute left-16 bg-[#111111] border border-white/10 text-[9px] font-mono text-zinc-400 px-2 py-1 uppercase tracking-wider rounded-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Bottom profile/auth indicator */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border border-white/10 bg-[#111111] flex items-center justify-center text-[10px] font-mono font-bold text-[#ff4400] rounded-sm">
            FO
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        
        {/* Top Header */}
        <header className="h-16 border-b border-white/10 bg-[#0a0a0a] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-zinc-600">CORE</span>
            <span className="text-zinc-800">/</span>
            <span className="text-[#fafafa] font-semibold uppercase">karnex-app-showcase</span>
            <span className="text-[10px] bg-[#ff4400]/10 border border-[#ff4400]/30 text-[#ff4400] px-1.5 py-0.5 rounded-sm uppercase font-bold tracking-wider">
              BUILDER v2.4
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-zinc-500">27/27 Agents Standby</span>
            </div>
            
            <button
              onClick={() => setCurrentView('studio')}
              className="dash-btn dash-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5" />
              Exec Sandbox
            </button>
          </div>
        </header>

        {/* View Inner Containers */}
        <main className="flex-1 overflow-y-auto p-8 relative min-h-0 bg-[#0a0a0a]">
          
          {/* VIEW: DASHBOARD HOME */}
          {currentView === 'dashboard' && (
            <div className="space-y-8 dash-reveal">
              <div className="space-y-1">
                <h2 className="font-display font-extrabold text-2xl text-[#fafafa] tracking-tight">Workspace Overview</h2>
                <p className="text-zinc-500 text-xs font-mono">Operations metrics compiled from decentralized context streams.</p>
              </div>

              {/* High Density Metric Cards (No Bento Box identical grid - asymmetrical layout) */}
              <div className="grid lg:grid-cols-3 gap-6">
                
                {/* Column 1: Development Velocity (Main card) */}
                <div className="lg:col-span-2 border border-white/10 bg-[#111111] p-6 flex flex-col justify-between h-[200px] hover:border-[#ff4400]/30 transition-all rounded-sm">
                  <div>
                    <span className="text-[10px] font-mono font-semibold tracking-wider text-zinc-500 uppercase block mb-2">Sprint Velocity & Deployments</span>
                    <h3 className="font-display font-extrabold text-2xl text-[#fafafa] tracking-tight">Active Project Sandbox</h3>
                    <p className="text-zinc-500 text-xs mt-2 leading-relaxed max-w-[420px]">
                      Builder core is processing 4 files in branch <code className="text-[#ff4400] bg-white/5 px-1 py-0.5">feat/auth-supabase</code>. Vercel deployment pipeline is standby.
                    </p>
                  </div>
                  <div className="flex items-center gap-8 border-t border-white/5 pt-4 font-mono text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                      <span className="text-zinc-400">TESTS: PASSING (100%)</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">REPOS: </span><span className="text-zinc-400">1 GitHub Connected</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Runways & Payouts */}
                <div className="border border-white/10 bg-[#111111] p-6 flex flex-col justify-between h-[200px] hover:border-[#ff4400]/30 transition-all rounded-sm">
                  <div>
                    <span className="text-[10px] font-mono font-semibold tracking-wider text-zinc-500 uppercase block mb-2">Stripe & Financials</span>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="font-display font-extrabold text-3xl text-[#ff4400]">$4,850</span>
                      <span className="text-[10px] text-zinc-600 font-mono">MRR</span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-2 leading-relaxed">
                      12-month runway projection indicates stable resource utilization. Next automated invoice cycles in 4 days.
                    </p>
                  </div>
                  <div className="border-t border-white/5 pt-4 font-mono text-[10px] text-zinc-500 flex justify-between">
                    <span>RUNWAY: 18 Months</span>
                    <span className="text-emerald-400 font-bold">STABLE</span>
                  </div>
                </div>

                {/* Column 3: Swarm Status (Side metrics) */}
                <div className="border border-white/10 bg-[#111111] p-6 flex flex-col justify-between h-[200px] hover:border-[#ff4400]/30 transition-all rounded-sm">
                  <div>
                    <span className="text-[10px] font-mono font-semibold tracking-wider text-zinc-500 uppercase block mb-2">Swarm Status & Momentum</span>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="font-display font-extrabold text-3xl text-zinc-100">94%</span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">+2.4%</span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-2 leading-relaxed">
                      Coaching agent reports consistent daily velocity thresholds are achieved. Active streak count is 14 days.
                    </p>
                  </div>
                  <div className="border-t border-white/5 pt-4 font-mono text-[10px] text-zinc-500 flex justify-between">
                    <span>ACTIVE TASKS: 12</span>
                    <span>STANDBY: 15</span>
                  </div>
                </div>

                {/* Column 4: Backlog (Dev checklist) */}
                <div className="lg:col-span-2 border border-white/10 bg-[#111111] p-6 space-y-4 hover:border-[#ff4400]/30 transition-all rounded-sm">
                  <span className="text-[10px] font-mono font-semibold tracking-wider text-zinc-500 uppercase block">Project Backlog Log</span>
                  <div className="space-y-3 font-mono text-xs text-zinc-300">
                    <div className="flex items-center gap-3 p-2 bg-white/5 border-l-2 border-[#ff4400]">
                      <CheckCircle className="w-4 h-4 text-[#ff4400] shrink-0" />
                      <span className="flex-1">Task #192: Scaffold checkout redirection handlers</span>
                      <span className="text-[9px] text-[#ff4400] bg-[#ff4400]/10 px-1 py-0.5 rounded-sm">HIGH</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 border-l-2 border-zinc-700">
                      <div className="w-4 h-4 border border-zinc-700 rounded-sm shrink-0"></div>
                      <span className="flex-1 text-zinc-500">Task #191: Index outbound leads for B2B SaaS outreach campaigns</span>
                      <span className="text-[9px] text-zinc-600 bg-white/5 px-1 py-0.5 rounded-sm">MED</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 border-l-2 border-zinc-700">
                      <div className="w-4 h-4 border border-zinc-700 rounded-sm shrink-0"></div>
                      <span className="flex-1 text-zinc-500">Task #190: Compile SEO landing sitemaps matching ICP keywords</span>
                      <span className="text-[9px] text-zinc-600 bg-white/5 px-1 py-0.5 rounded-sm">LOW</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* VIEW: STUDIO SANDBOX */}
          {currentView === 'studio' && (
            <div className="h-full flex flex-col min-h-[500px] border border-white/10 bg-[#111111] shadow-2xl rounded-sm overflow-hidden dash-reveal">
              {/* Studio Workspace panels */}
              <div className="flex-1 grid lg:grid-cols-12 min-h-0 relative">
                
                {/* Panel 1: Chat Sandbox */}
                <div className="lg:col-span-5 border-r border-white/10 flex flex-col min-h-0 bg-[#0c0c0c]/40">
                  <div className="p-4 border-b border-white/5 bg-[#111111]/80 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold tracking-wider text-[#ff4400] uppercase">CTO Builder Swarm</span>
                    <span className="text-[9px] font-mono text-zinc-500">CONV: MAIN</span>
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-[12px]">
                    {studioMessages.map((msg, i) => {
                      const isUser = msg.sender === 'user'
                      return (
                        <div key={i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 mb-1 text-[9px] text-zinc-500">
                            <span>{isUser ? 'FOUNDER' : 'BUILDER_CORE'}</span>
                            <span>•</span>
                            <span>{msg.time}</span>
                          </div>
                          <div className={`p-3 max-w-[85%] border leading-relaxed ${
                            isUser 
                              ? 'bg-[#111111] border-white/10 text-zinc-300 rounded-sm' 
                              : 'bg-[#ff4400]/5 border-[#ff4400]/20 text-[#fafafa] rounded-sm'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Chat input */}
                  <form onSubmit={handleStudioSubmit} className="p-4 border-t border-white/5 bg-[#111111]/50 flex gap-2">
                    <input
                      type="text"
                      value={studioInput}
                      onChange={(e) => setStudioInput(e.target.value)}
                      placeholder="Instruct Builder agent..."
                      className="flex-1 dash-input"
                    />
                    <button type="submit" className="dash-btn dash-btn-primary px-3.5">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>

                {/* Panel 2: Code Preview Sandbox */}
                <div className="lg:col-span-7 flex flex-col min-h-0">
                  <div className="p-4 border-b border-white/5 bg-[#111111]/80 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-xs font-mono text-zinc-300">karnex-project-x.vercel.app</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={runMockDeploy}
                        disabled={isDeploying}
                        className="dash-btn dash-btn-secondary text-[11px] py-1 px-3"
                      >
                        {isDeploying ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin text-[#ff4400]" />
                            Deploying...
                          </>
                        ) : (
                          'Deploy changes'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Live Web Sandbox Preview Mock */}
                  <div className="flex-1 bg-[#0a0a0a] relative flex items-center justify-center p-6 border-b border-white/10 overflow-hidden">
                    <div className="absolute inset-0 bg-[#0a0a0a] forge-grid-bg opacity-30 pointer-events-none" />
                    <div className="max-w-[420px] text-center space-y-4 z-10 border border-white/10 bg-[#111111] p-8 rounded-sm">
                      <div className="w-12 h-12 bg-[#ff4400]/10 border border-[#ff4400]/30 flex items-center justify-center text-[#ff4400] mx-auto rounded-sm">
                        <Code className="w-6 h-6" />
                      </div>
                      <h4 className="font-display font-extrabold text-lg tracking-tight">Project Preview Sandbox</h4>
                      <p className="text-[#888888] text-xs leading-relaxed">
                        This panel displays the compiled NextJS application output. Deploy your local modifications to Vercel to inspect modifications live.
                      </p>
                      <div className="pt-2 flex justify-center gap-3">
                        <a 
                          href="https://karnex-project-x.vercel.app" 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[11px] font-mono text-zinc-500 hover:text-[#ff4400] flex items-center gap-1 transition-colors"
                        >
                          Open in browser
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Inline Terminal Logs Panel (Professional logs instead of bubbly chat) */}
                  <div className="h-[180px] border-t border-white/5 bg-[#0a0a0a] flex flex-col min-h-0 font-mono text-[11px] p-4 text-zinc-400">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2 shrink-0">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Builder Execution Console</span>
                      <span className="text-[9px] text-zinc-600">STDOUT / STDERR</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
                      {studioLogs.map((log, i) => {
                        let color = 'text-zinc-500'
                        if (log.startsWith('[builder]')) color = 'text-zinc-300'
                        else if (log.includes('success:')) color = 'text-emerald-400'
                        else if (log.includes('live at:')) color = 'text-sky-400 underline'
                        else if (log.startsWith('[user]')) color = 'text-[#ff4400]'
                        return (
                          <div key={i} className={`leading-relaxed ${color}`}>
                            {log}
                          </div>
                        )
                      })}
                      <div ref={terminalEndRef} />
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* VIEW: INTEGRATIONS API (Connections Graph) */}
          {currentView === 'integrations' && (
            <div className="space-y-8 dash-reveal">
              <div className="space-y-1">
                <h2 className="font-display font-extrabold text-2xl text-[#fafafa] tracking-tight">API Integration Graph</h2>
                <p className="text-zinc-500 text-xs font-mono">Live visualization of OAuth connections and webhook handlers active in the swarm.</p>
              </div>

              {/* Connections Graph Container */}
              <div className="border border-white/10 bg-[#111111] p-8 rounded-sm relative overflow-hidden h-[480px] flex items-center justify-center">
                <div className="absolute inset-0 bg-[#0a0a0a] forge-grid-bg opacity-30 pointer-events-none" />

                {/* SVG Connecting Paths */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  {/* Left Side Lines */}
                  <path d="M 220 100 L 400 240" stroke={hoveredIntegration === 'github' ? '#ff4400' : '#222222'} strokeWidth="1.5" fill="none" className="transition-all" />
                  <path d="M 220 240 L 400 240" stroke={hoveredIntegration === 'stripe' ? '#ff4400' : '#222222'} strokeWidth="1.5" fill="none" className="transition-all" />
                  <path d="M 220 380 L 400 240" stroke={hoveredIntegration === 'openai' ? '#ff4400' : '#222222'} strokeWidth="1.5" fill="none" className="transition-all" />
                  
                  {/* Right Side Lines */}
                  <path d="M 580 100 L 400 240" stroke={hoveredIntegration === 'vercel' ? '#ff4400' : '#222222'} strokeWidth="1.5" fill="none" className="transition-all" />
                  <path d="M 580 240 L 400 240" stroke={hoveredIntegration === 'supabase' ? '#ff4400' : '#222222'} strokeWidth="1.5" fill="none" className="transition-all" />
                  <path d="M 580 380 L 400 240" stroke={hoveredIntegration === 'resend' ? '#ff4400' : '#222222'} strokeWidth="1.5" fill="none" className="transition-all" />
                  
                  {/* Glowing pulsing dot traversing lines if hovered */}
                  {hoveredIntegration && (
                    <circle r="3" fill="#ff4400" className="forge-pulse-ring">
                      <animateMotion
                        dur="1.5s"
                        repeatCount="indefinite"
                        path={
                          hoveredIntegration === 'github' ? 'M 220 100 L 400 240' :
                          hoveredIntegration === 'stripe' ? 'M 220 240 L 400 240' :
                          hoveredIntegration === 'openai' ? 'M 220 380 L 400 240' :
                          hoveredIntegration === 'vercel' ? 'M 580 100 L 400 240' :
                          hoveredIntegration === 'supabase' ? 'M 580 240 L 400 240' :
                          'M 580 380 L 400 240'
                        }
                      />
                    </circle>
                  )}
                </svg>

                {/* Central Karnex Node */}
                <div className="absolute left-[360px] top-[200px] w-20 h-20 bg-[#0a0a0a] border-2 border-[#ff4400] flex flex-col items-center justify-center z-10 shadow-2xl rounded-sm">
                  <div className="w-3 h-3 bg-[#ff4400] rounded-full animate-ping absolute -top-1.5" />
                  <span className="font-mono text-[9px] text-[#ff4400] font-extrabold tracking-widest">KARNEX</span>
                  <span className="font-mono text-[8px] text-zinc-500">CORE</span>
                </div>

                {/* Integration Nodes (Stark developer-centric cards) */}
                {/* Node: GitHub */}
                <div
                  onMouseEnter={() => setHoveredIntegration('github')}
                  onMouseLeave={() => setHoveredIntegration(null)}
                  className="absolute left-[80px] top-[60px] w-[140px] border border-white/10 bg-[#0a0a0a] p-3 text-left hover:border-[#ff4400] transition-colors rounded-sm z-10"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <GithubIcon className="w-4 h-4 text-zinc-300" />
                    <span className="font-display font-extrabold text-[11px] text-[#fafafa]">GitHub</span>
                  </div>
                  <span className="font-mono text-[9px] text-emerald-400 font-bold block">CONNECTED</span>
                  <span className="font-mono text-[8px] text-zinc-600 block mt-1">LATENCY: 42ms</span>
                </div>

                {/* Node: Stripe */}
                <div
                  onMouseEnter={() => setHoveredIntegration('stripe')}
                  onMouseLeave={() => setHoveredIntegration(null)}
                  className="absolute left-[80px] top-[200px] w-[140px] border border-white/10 bg-[#0a0a0a] p-3 text-left hover:border-[#ff4400] transition-colors rounded-sm z-10"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <BarChart className="w-4 h-4 text-[#ff4400]" />
                    <span className="font-display font-extrabold text-[11px] text-[#fafafa]">Stripe</span>
                  </div>
                  <span className="font-mono text-[9px] text-emerald-400 font-bold block">CONNECTED</span>
                  <span className="font-mono text-[8px] text-zinc-600 block mt-1">WEBHOOKS ACTIVE</span>
                </div>

                {/* Node: OpenAI */}
                <div
                  onMouseEnter={() => setHoveredIntegration('openai')}
                  onMouseLeave={() => setHoveredIntegration(null)}
                  className="absolute left-[80px] top-[340px] w-[140px] border border-white/10 bg-[#0a0a0a] p-3 text-left hover:border-[#ff4400] transition-colors rounded-sm z-10"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Cpu className="w-4 h-4 text-zinc-300" />
                    <span className="font-display font-extrabold text-[11px] text-[#fafafa]">OpenAI API</span>
                  </div>
                  <span className="font-mono text-[9px] text-emerald-400 font-bold block">CONNECTED</span>
                  <span className="font-mono text-[8px] text-zinc-600 block mt-1">RATE LIMIT: OK</span>
                </div>

                {/* Node: Vercel */}
                <div
                  onMouseEnter={() => setHoveredIntegration('vercel')}
                  onMouseLeave={() => setHoveredIntegration(null)}
                  className="absolute right-[80px] top-[60px] w-[140px] border border-white/10 bg-[#0a0a0a] p-3 text-left hover:border-[#ff4400] transition-colors rounded-sm z-10"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Globe className="w-4 h-4 text-zinc-300" />
                    <span className="font-display font-extrabold text-[11px] text-[#fafafa]">Vercel Deploy</span>
                  </div>
                  <span className="font-mono text-[9px] text-emerald-400 font-bold block">CONNECTED</span>
                  <span className="font-mono text-[8px] text-zinc-600 block mt-1">HOSTING ACTIVE</span>
                </div>

                {/* Node: Supabase */}
                <div
                  onMouseEnter={() => setHoveredIntegration('supabase')}
                  onMouseLeave={() => setHoveredIntegration(null)}
                  className="absolute right-[80px] top-[200px] w-[140px] border border-white/10 bg-[#0a0a0a] p-3 text-left hover:border-[#ff4400] transition-colors rounded-sm z-10"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Database className="w-4 h-4 text-zinc-300" />
                    <span className="font-display font-extrabold text-[11px] text-[#fafafa]">Supabase DB</span>
                  </div>
                  <span className="font-mono text-[9px] text-emerald-400 font-bold block">CONNECTED</span>
                  <span className="font-mono text-[8px] text-zinc-600 block mt-1">TABLES ACTIVE</span>
                </div>

                {/* Node: Resend */}
                <div
                  onMouseEnter={() => setHoveredIntegration('resend')}
                  onMouseLeave={() => setHoveredIntegration(null)}
                  className="absolute right-[80px] top-[340px] w-[140px] border border-white/10 bg-[#0a0a0a] p-3 text-left hover:border-[#ff4400] transition-colors rounded-sm z-10"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Mail className="w-4 h-4 text-zinc-300" />
                    <span className="font-display font-extrabold text-[11px] text-[#fafafa]">Resend SMTP</span>
                  </div>
                  <span className="font-mono text-[9px] text-emerald-400 font-bold block">CONNECTED</span>
                  <span className="font-mono text-[8px] text-zinc-600 block mt-1">DOMAINS VERIFIED</span>
                </div>

              </div>
            </div>
          )}

          {/* VIEW: SECRETS VAULT */}
          {currentView === 'vault' && (
            <div className="space-y-8 dash-reveal">
              <div className="space-y-1">
                <h2 className="font-display font-extrabold text-2xl text-[#fafafa] tracking-tight">Secrets & Memory Vault</h2>
                <p className="text-zinc-500 text-xs font-mono">Encrypted files, key stores, and workspace backups tracked by the swarm.</p>
              </div>

              {/* Data Table Search and Filtering */}
              <div className="border border-white/10 bg-[#111111] p-6 rounded-sm space-y-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
                  
                  {/* Search Bar */}
                  <div className="relative max-w-sm flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={vaultSearch}
                      onChange={(e) => setVaultSearch(e.target.value)}
                      placeholder="Filter by file name, agent, or format..."
                      className="pl-10 pr-4 py-2 w-full dash-input"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-zinc-500">INDEX: AES-GCM Encrypted</span>
                  </div>
                </div>

                {/* High Density File System Data Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-500 pb-3">
                        <th className="pb-3 font-semibold uppercase tracking-wider">File Name</th>
                        <th className="pb-3 font-semibold uppercase tracking-wider">Format</th>
                        <th className="pb-3 font-semibold uppercase tracking-wider">Source Agent</th>
                        <th className="pb-3 font-semibold uppercase tracking-wider">File Size</th>
                        <th className="pb-3 font-semibold uppercase tracking-wider">Last Sync</th>
                        <th className="pb-3 font-semibold uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-zinc-300">
                      {filteredVaultFiles.length > 0 ? (
                        filteredVaultFiles.map((file) => (
                          <tr key={file.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="py-3.5 font-bold text-[#fafafa] flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-zinc-500" />
                              {file.name}
                            </td>
                            <td className="py-3.5">
                              <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-sm uppercase tracking-wider font-semibold text-zinc-400">
                                {file.type}
                              </span>
                            </td>
                            <td className="py-3.5 text-zinc-400">{file.agent}</td>
                            <td className="py-3.5 text-zinc-500">{file.size}</td>
                            <td className="py-3.5 text-zinc-500">{file.date}</td>
                            <td className="py-3.5 text-right">
                              <button className="text-[10px] font-semibold text-zinc-500 hover:text-[#ff4400] transition-colors">
                                DECRYPT_FILE
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-zinc-600">
                            No secrets or files match current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          )}

          {/* VIEW: SETTINGS (Vercel-style clean config) */}
          {currentView === 'settings' && (
            <div className="max-w-2xl space-y-8 dash-reveal">
              <div className="space-y-1">
                <h2 className="font-display font-extrabold text-2xl text-[#fafafa] tracking-tight">Configuration Panel</h2>
                <p className="text-zinc-500 text-xs font-mono">System thresholds and model overrides configuration dashboard.</p>
              </div>

              {/* Vercel-style clean panel */}
              <div className="border border-white/10 bg-[#111111] rounded-sm divide-y divide-white/10">
                
                {/* Section 1: Founder details */}
                <div className="p-6 space-y-4">
                  <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">FOUNDER_PROFILE</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-zinc-500 uppercase">Founder Display Name</label>
                      <input
                        type="text"
                        defaultValue="Alex Founder"
                        className="dash-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-zinc-500 uppercase">Context Email Channel</label>
                      <input
                        type="email"
                        defaultValue="alex@founder-app.io"
                        className="dash-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Segmented controls (Beginner/Intermediate/Advanced) */}
                <div className="p-6 space-y-4">
                  <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">TECHNICAL_THRESHOLD</h3>
                  <p className="text-zinc-500 text-[11px] leading-relaxed font-mono">Adjusts the granularity of agent terminal messages and manual approval prompts.</p>
                  
                  <div className="flex border border-white/10 p-1 bg-[#0a0a0a] rounded-sm max-w-sm">
                    {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setSettingsTechLevel(level)}
                        className={`flex-1 text-center py-1.5 font-mono text-[10px] font-bold uppercase transition-colors rounded-sm ${
                          settingsTechLevel === level
                            ? 'bg-[#ff4400] text-white'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 3: Segmented Controls for Speed */}
                <div className="p-6 space-y-4">
                  <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">LLM_VELOCITY_PRESET</h3>
                  <p className="text-zinc-500 text-[11px] leading-relaxed font-mono">Bypasses routing steps to force high-speed reasoning grids or advanced coding agents.</p>
                  
                  <div className="flex border border-white/10 p-1 bg-[#0a0a0a] rounded-sm max-w-sm">
                    {(['fast', 'balanced', 'max'] as const).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSettingsSpeed(preset)}
                        className={`flex-1 text-center py-1.5 font-mono text-[10px] font-bold uppercase transition-colors rounded-sm ${
                          settingsSpeed === preset
                            ? 'bg-[#ff4400] text-white'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 4: Stark High Contrast Toggles */}
                <div className="p-6 space-y-4">
                  <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">SYSTEM_POLICIES</h3>
                  <div className="space-y-4 font-mono text-xs">
                    
                    {/* Policy: Proactive scan */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[#fafafa] font-bold">PROACTIVE_SECURITY_SCANNING</span>
                        <p className="text-zinc-500 text-[10px]">Scans codebase for secrets and vulnerability patterns prior to builds.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettingsToggles(prev => ({ ...prev, proactiveScan: !prev.proactiveScan }))}
                        className={`w-10 h-5 border transition-colors relative rounded-sm ${
                          settingsToggles.proactiveScan 
                            ? 'border-[#ff4400] bg-[#ff4400]' 
                            : 'border-white/15 bg-white/5'
                        }`}
                      >
                        <span className={`w-3 h-3 bg-white absolute top-0.5 transition-all rounded-sm ${
                          settingsToggles.proactiveScan ? 'left-6' : 'left-0.5'
                        }`} />
                      </button>
                    </div>

                    {/* Policy: Auto-rotate */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[#fafafa] font-bold">AUTOMATED_KEY_ROTATION</span>
                        <p className="text-zinc-500 text-[10px]">Automatically rotates Vercel and Supabase tokens every 30 days.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettingsToggles(prev => ({ ...prev, autoRotate: !prev.autoRotate }))}
                        className={`w-10 h-5 border transition-colors relative rounded-sm ${
                          settingsToggles.autoRotate 
                            ? 'border-[#ff4400] bg-[#ff4400]' 
                            : 'border-white/15 bg-white/5'
                        }`}
                      >
                        <span className={`w-3 h-3 bg-white absolute top-0.5 transition-all rounded-sm ${
                          settingsToggles.autoRotate ? 'left-6' : 'left-0.5'
                        }`} />
                      </button>
                    </div>

                    {/* Policy: Telemetry */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[#fafafa] font-bold">VERBOSE_EXECUTION_TELEMETRY</span>
                        <p className="text-zinc-500 text-[10px]">Streams raw node agent stdout directly to the central vault logs.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettingsToggles(prev => ({ ...prev, telemetry: !prev.telemetry }))}
                        className={`w-10 h-5 border transition-colors relative rounded-sm ${
                          settingsToggles.telemetry 
                            ? 'border-[#ff4400] bg-[#ff4400]' 
                            : 'border-white/15 bg-white/5'
                        }`}
                      >
                        <span className={`w-3 h-3 bg-white absolute top-0.5 transition-all rounded-sm ${
                          settingsToggles.telemetry ? 'left-6' : 'left-0.5'
                        }`} />
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  )
}
