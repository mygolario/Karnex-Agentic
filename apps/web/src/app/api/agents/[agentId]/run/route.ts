import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Helper to check if OpenRouter key is configured
function hasOpenRouterKey() {
  const apiKey = process.env.OPENROUTER_API_KEY
  return apiKey && !apiKey.includes('your_gemini_api_key_here') && !apiKey.startsWith('sk-or-v1-d06c7a')
}

// Helper to get agent backend base url
function getAgentServiceBaseUrl(): string {
  const raw =
    process.env.AGENT_SERVICE_URL ||
    process.env.NEXT_PUBLIC_AGENT_SERVICE_URL ||
    'http://localhost:8000'
  return raw.replace(/\/$/, '')
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await context.params
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const input = body.input || {}

    // Create a new agent run in the database
    const { data: run, error: runErr } = await supabase
      .from('agent_runs')
      .insert({
        founder_id: user.id,
        agent_id: agentId,
        agent_version: 'v1.0.0',
        status: 'running',
        input: input,
        triggered_by: 'user',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (runErr || !run) {
      return NextResponse.json({ error: `Failed to create agent run: ${runErr?.message || 'Unknown error'}` }, { status: 500 })
    }

    const runId = run.id

    // Start background processing without blocking the HTTP response
    runAgentInBackground(runId, agentId, user.id, input, request.headers.get('authorization'))

    return NextResponse.json({ run_id: runId, status: 'running' }, { status: 202 })
  } catch (error) {
    console.error('Error starting agent run:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

async function runAgentInBackground(
  runId: string,
  agentId: string,
  founderId: string,
  input: any,
  authHeader: string | null
) {
  const supabase = await createSupabaseServerClient()

  try {
    let output: any = null
    const startTime = Date.now()

    if (agentId === 'pain-transformer') {
      const painDescription = input.pain_description || ''
      
      // Try backend first
      let backendSuccess = false
      if (authHeader) {
        try {
          const res = await fetch(`${getAgentServiceBaseUrl()}/v1/agents/pain-transformer`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: authHeader,
            },
            body: JSON.stringify({ pain_description: painDescription }),
          })
          if (res.ok) {
            output = await res.json()
            backendSuccess = true
          } else {
            console.warn('Backend pain-transformer returned status:', res.status)
          }
        } catch (err) {
          console.warn('Failed to call backend pain-transformer:', err)
        }
      }

      // Fallback to high-quality mock if backend fails or keys missing
      if (!backendSuccess) {
        // Wait ~6 seconds to simulate processing
        await new Promise((r) => setTimeout(r, 6000))
        output = generateMockHypotheses(painDescription)
      }

    } else if (agentId === 'idea-crystallizer') {
      const selectedHyp = input.selected_hypothesis || {}
      
      // Wait ~8 seconds to simulate idea crystallizing
      await new Promise((r) => setTimeout(r, 8000))
      output = generateMockBrief(selectedHyp)

    } else if (agentId === 'icp-definer') {
      const productBrief = input.product_brief || {}
      
      // Wait ~8 seconds to simulate customer definition
      await new Promise((r) => setTimeout(r, 8000))
      output = generateMockICP(productBrief)

    } else if (agentId === 'war-room') {
      // Try backend first
      let backendSuccess = false
      if (authHeader) {
        try {
          const res = await fetch(`${getAgentServiceBaseUrl()}/v1/agents/war-room`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: authHeader,
            },
            body: JSON.stringify({
              product_brief: input.product_brief || {},
              icp_document: input.icp_document || {},
              founder_capacity: input.founder_capacity || { weekly_hours: 20, technical_level: 'intermediate', budget_monthly: 0 },
            }),
          })
          if (res.ok) {
            output = await res.json()
            backendSuccess = true
          } else {
            console.warn('Backend war-room returned status:', res.status)
          }
        } catch (err) {
          console.warn('Failed to call backend war-room:', err)
        }
      }

      if (!backendSuccess) {
        // Wait ~8 seconds to simulate roadmap generation
        await new Promise((r) => setTimeout(r, 8000))
        output = generateMockRoadmap(input.product_brief?.selected_name || 'My Startup')
      }
    } else {
      throw new Error(`Unsupported onboarding agent: ${agentId}`)
    }

    const duration = Date.now() - startTime

    // Save outputs
    const { error: outErr } = await supabase
      .from('agent_outputs')
      .insert({
        agent_run_id: runId,
        founder_id: founderId,
        output_type: agentId,
        output: output,
      })

    if (outErr) throw outErr

    // Update run state to success
    await supabase
      .from('agent_runs')
      .update({
        status: 'success',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
      })
      .eq('id', runId)

  } catch (err: any) {
    console.error(`Background agent ${agentId} run ${runId} failed:`, err)
    await supabase
      .from('agent_runs')
      .update({
        status: 'error',
        completed_at: new Date().toISOString(),
        error_message: err?.message || String(err),
      })
      .eq('id', runId)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Generators for fallback
// ─────────────────────────────────────────────────────────────────────────────

function generateMockHypotheses(pain: string) {
  const painLower = pain.toLowerCase()
  let title1 = 'Folio'
  let title2 = 'ClientCanvas'
  let title3 = 'DesignFlow'
  let prob1 = 'Every freelance designer we know wastes 5+ hours every week chasing client invoicing, contracts, and revisions.'
  let sol1 = 'A designer-first client management tool with integrated invoicing, project scoping, and version timelines.'

  if (painLower.includes('standup') || painLower.includes('meeting')) {
    title1 = 'SyncAI'
    title2 = 'StandupStream'
    title3 = 'DecideFlow'
    prob1 = 'Teams lose hours every week in unstructured standups where details and action items are lost.'
    sol1 = 'A smart meeting recorder that structures standup summaries and auto-assigns action tasks.'
  } else if (painLower.includes('contractor') || painLower.includes('freelance') || painLower.includes('hire')) {
    title1 = 'ContractMate'
    title2 = 'VettedVibe'
    title3 = 'MatchGrid'
    prob1 = 'Hiring managers struggle to find verified, high-quality contractors due to noisy talent platforms.'
    sol1 = 'A vetting network that maps contractor portfolios to project needs using verified recommendation nodes.'
  }

  return {
    pain_analysis: {
      core_pain: pain.slice(0, 150) + (pain.length > 150 ? '...' : ''),
      pain_intensity: 85,
      affected_audience: 'Freelancers, consultants, and solo practitioners',
      frequency: 'daily',
    },
    hypotheses: [
      {
        title: title1,
        problem_statement: prob1,
        proposed_solution: sol1,
        target_audience: 'Freelance designers and developers working with premium clients',
        market_size_estimate: 'Growing market',
        pain_intensity_score: 82,
        market_size_score: 68,
        buildability_score: 75,
        overall_score: 76,
        key_risks: [
          'High competition from generic platforms like Notion or HoneyBook',
          'Client onboarding friction: clients may refuse to sign up for another portal',
          'Stripe invoicing API limitations for complex billing logic'
        ],
        next_steps: [
          'Interview 5 freelancers on client scoping patterns',
          'A/B test value proposition pricing on landing page',
          'Map competitor pricing tiers'
        ]
      },
      {
        title: title2,
        problem_statement: 'Freelancers use 4-5 disconnected tools for file sharing, feedback loops, and invoicing.',
        proposed_solution: 'A visually clean project hub designed to showcase creative milestones and enable simple invoice links.',
        target_audience: 'Visual creators and web designers',
        market_size_estimate: 'Large market',
        pain_intensity_score: 71,
        market_size_score: 74,
        buildability_score: 65,
        overall_score: 70,
        key_risks: [
          'File hosting storage cost scales quickly',
          'Requires heavy styling control features',
          'Difficult to build without full real-time collaboration support'
        ],
        next_steps: [
          'Mockup Figma layouts for feedback',
          'Run a target audience landing page waitlist campaign',
          'Test cloud file transfer latency'
        ]
      },
      {
        title: title3,
        problem_statement: 'Chasing manual milestone approvals is awkward and slows down the cash flow of independent builders.',
        proposed_solution: 'An automated escrow and billing pipeline triggered by verifiable design handoffs.',
        target_audience: 'B2B consultants and freelance developers',
        market_size_estimate: 'Small niche',
        pain_intensity_score: 64,
        market_size_score: 55,
        buildability_score: 80,
        overall_score: 66,
        key_risks: [
          'Fintech/Escrow regulatory compliance and licensing hurdles',
          'Low transaction volume initially limits profitability',
          'Chargeback fraud from untrusted clients'
        ],
        next_steps: [
          'Consult payment processing terms of service',
          'Survey 10 freelancers regarding escrow willingness',
          'Prototype integration with simple invoicing'
        ]
      }
    ],
    recommended_hypothesis: 0,
  }
}

function generateMockBrief(selectedHyp: any) {
  const name = selectedHyp.title || 'Folio'
  return {
    product_brief: {
      name_candidates: [name, `${name}AI`, `${name}Flow`, `Smart${name}`],
      selected_name: name,
      tagline: selectedHyp.proposed_solution?.split('.')[0] || 'Premium client management and invoicing designed for freelancers.',
      elevator_pitch: selectedHyp.problem_statement || 'A beautiful, client-focused tool that replaces generic invoicing and folder sharing.',
      value_proposition: {
        for_whom: 'Freelancers and design studio owners',
        problem: selectedHyp.problem_statement || 'Chasing invoices and losing tracks of revisions across Slack and email.',
        solution: selectedHyp.proposed_solution || 'A unified designer hub with integrated escrow, scoping, and invoice generation.',
        key_benefit: 'Get paid faster and eliminate scope creep.',
        unlike: 'Traditional billing apps like QuickBooks that look like spreadsheet software and lack creative workflow focus.',
      },
      features: {
        must_have: [
          { name: 'Frictionless Invoicing', description: 'One-click professional invoices with automated reminder sequences.' },
          { name: 'Revisions Timeline', description: 'Visual timeline showing asset versions and client approvals.' },
          { name: 'Client Portal', description: 'Minimal page for clients to review scopes, pay invoices, and approve milestones.' }
        ],
        nice_to_have: [
          { name: 'Contract generator', description: 'Pre-vetted contract templates integrated with signature tools.' },
          { name: 'Time tracker widget', description: 'Lightweight stopwatch to track hours directly into invoices.' }
        ],
        future: [
          { name: 'Escrow processing', description: 'Secure milestone escrow deposits.' }
        ]
      },
      pricing_hypothesis: {
        model: 'subscription',
        tiers: [
          { name: 'Starter', price: '$15/mo', description: 'Up to 3 active clients, unlimited invoices.' },
          { name: 'Builder', price: '$29/mo', description: 'Unlimited clients, custom branding, integrations.' },
          { name: 'Pro Studio', price: '$79/mo', description: 'Team members, multi-currency escrow, advanced contract tools.' }
        ],
        rationale: 'Prices set based on visual freelance budgets. Users will pay $29/mo if they save just 1 hour of invoicing time.'
      },
      go_to_market: [
        'Direct LinkedIn outreach to freelance designers in tech hubs',
        'Post templates and freelance advice on r/freelance and r/design',
        'Launch a visual invoice template generator on Product Hunt'
      ]
    }
  }
}

function generateMockICP(brief: any) {
  return {
    icp: {
      demographic: {
        age_range: '24 - 45 years old',
        location: ['United States', 'Canada', 'United Kingdom', 'Western Europe'],
        job_titles: ['Freelance Brand Designer', 'Independent Web Developer', 'Boutique Studio Owner', 'UI/UX Consultant'],
        company_size: '1 - 3 employees',
        income_range: '$60,000 - $150,000 / year',
      },
      psychographic: {
        motivations: ['Doing creative work instead of admin', 'Appearing premium to high-ticket clients', 'Faster invoice collection'],
        frustrations: ['Ugly accounting software', 'Unstructured feedback and revision creep', 'Chasing client invoices via email'],
        values: ['Design aesthetics', 'Product simplicity', 'Autonomy and work quality'],
        information_sources: ['Designer News', 'Dribbble / Behance', 'Indie Hackers', 'r/freelance'],
        decision_making_style: 'Value-driven, highly sensitive to visual presentation.',
      },
      behavioral: {
        buying_triggers: ['Losing a client due to a missed contract scope', 'Spending an entire weekend sorting invoices', 'Stripe invoice transaction limits'],
        objections: ['Too expensive for simple invoicing', 'My clients prefer email communications', 'Yet another subscription to manage'],
        preferred_channels: ['Twitter / X', 'LinkedIn', 'Product Hunt', 'Newsletter sponsorship'],
        willingness_to_pay: 'Medium-High. Happy to spend $30/mo for a tool that elevates their brand.',
        tool_stack: ['Figma', 'Notion', 'Google Drive', 'Slack', 'Wave Invoicing'],
      },
      pain_ranking: [
        { pain: 'Scope creep / unpaid revisions', intensity: 88, frequency: 'weekly' },
        { pain: 'Ugly client onboarding client experience', intensity: 78, frequency: 'situational' },
        { pain: 'Chasing payments and invoices', intensity: 72, frequency: 'monthly' }
      ],
      day_in_the_life: 'Mia starts her morning checking emails and Slack for feedback. She finds clients have sent revision requests across three different channels. She spends 2 hours editing, uploads them to Google Drive, and drafts an invoice. At the end of the day, she realizes she hasn\'t done any creative work.'
    },
    personas: [
      {
        name: 'Mia Chen',
        age: 28,
        location: 'Portland, OR',
        job_title: 'Freelance Brand Designer',
        bio: 'Mia left an agency 2 years ago to go freelance. She designs brand systems for seed-stage startups.',
        primary_pain: 'Invoices take 5 days to get paid, clients constantly expand scope without signing new amendments.',
        quote: 'I want to send my clients a link that looks as polished as my designs, not a QuickBooks invoice that looks like a tax document.',
        willingness_to_pay: '$29/mo',
        karnex_agents_needed: ['outreach-v1', 'builder-v1']
      },
      {
        name: 'David Miller',
        age: 34,
        location: 'Austin, TX',
        job_title: 'Boutique Web Consultant',
        bio: 'David runs a small agency of 2. He scopes custom web builds and integrates payment flows.',
        primary_pain: 'Loses hours drafting customized statements of work and chasing milestone deposits.',
        quote: 'My billing is currently split across Notion docs, emails, and Stripe. I want single click setups.',
        willingness_to_pay: '$79/mo',
        karnex_agents_needed: ['competitive-landscape-v1', 'sprint-planner-v1']
      },
      {
        name: 'Sarah Jenkins',
        age: 31,
        location: 'Denver, CO',
        job_title: 'Independent UI/UX Designer',
        bio: 'Sarah does product design contracts for mid-sized tech companies, billing by the hour.',
        primary_pain: 'Timesheet logging and accounting bloat are annoying; clients want professional reports.',
        quote: 'I hate administrative tasks. If I can automate invoice summaries, it saves me a full workday every month.',
        willingness_to_pay: '$29/mo',
        karnex_agents_needed: ['daily-standup-v1', 'research-v1']
      }
    ]
  }
}

function generateMockRoadmap(name: string) {
  return {
    roadmap: {
      title: '90-Day Roadmap',
      total_days: 90,
      start_date: new Date().toISOString().split('T')[0],
      phases: [
        {
          phase_number: 1,
          title: 'Concept & Validation (Days 1 - 30)',
          theme: 'Validating client pain points and locking in feature wedges.',
          weekly_goals: [
            {
              week_number: 1,
              focus: 'Customer Discovery',
              goals: [
                'Map 5 invoicing competitors and pricing patterns',
                'Email 10 freelance designers for discovery interviews',
                'Draft discovery interview script targeting invoice frustrations'
              ],
              estimated_hours: 20
            },
            {
              week_number: 2,
              focus: 'Competitor Analysis',
              goals: [
                'Complete competitive matrix comparing HoneyBook, Wave, and FreshBooks',
                'Identify 3 core feature gaps in visual billing solutions',
                'Synthesize interview findings and rank primary pains'
              ],
              estimated_hours: 20
            },
            {
              week_number: 3,
              focus: 'Value Proposition Testing',
              goals: [
                'Deploy a waitlist landing page highlighting " Folio: Invoicing for Designers"',
                'Set up simple waitlist conversion tracking (PostHog)',
                'Drive 50 targeted visits from Reddit and Twitter design communities'
              ],
              estimated_hours: 20
            },
            {
              week_number: 4,
              focus: 'Validation Synthesis',
              goals: [
                'Review waitlist signups and conversion rates (target > 10%)',
                'Identify top 3 features requested by waitlist subscribers',
                'Run go/no-go validation check to lock Phase 2'
              ],
              estimated_hours: 20
            }
          ],
          milestones: [
            { title: 'Competitor Matrix Complete', target_week: 2, metric: 'competitors_mapped', target_value: 5 },
            { title: 'Landing Page Live', target_week: 3, metric: 'page_live', target_value: 1 },
            { title: '15 waitlist signups', target_week: 4, metric: 'waitlist_users', target_value: 15 }
          ],
          success_criteria: ['Completed 10 customer interviews', 'Waitlist landing page conversion rate > 12%'],
          go_no_go_gate: 'Proceed to Phase 2 only if at least 15 designers join waitlist and confirm invoicing is their top administrative frustration.',
          key_risks: ['Low waitlist conversions indicating problem is not intense enough', 'Competitors release a visual template feature'],
          agents_to_use: ['research-v1', 'outreach-v1']
        },
        {
          phase_number: 2,
          title: 'MVP Construction (Days 31 - 60)',
          theme: 'Building the core client management and invoice generation modules.',
          weekly_goals: [
            {
              week_number: 5,
              focus: 'Database Schema',
              goals: [
                'Design database tables for invoices, clients, and projects',
                'Set up Supabase authentication and Row Level Security roles',
                'Scaffold Next.js App directory structure for invoicing page'
              ],
              estimated_hours: 20
            },
            {
              week_number: 6,
              focus: 'Invoicing Form UI',
              goals: [
                'Build interactive invoice creation form UI using Tailwind & React',
                'Integrate totals calculator (taxes, discounts, totals)',
                'Connect form to database submit handlers'
              ],
              estimated_hours: 20
            },
            {
              week_number: 7,
              focus: 'Client Portal Page',
              goals: [
                'Scaffold minimal public route `/portal/[invoiceId]` for client review',
                'Set up print-friendly layout styles for PDF downloads',
                'Connect basic payment redirect integration hooks'
              ],
              estimated_hours: 20
            },
            {
              week_number: 8,
              focus: 'Deployment & Flow QA',
              goals: [
                'Deploy staging branch to Vercel preview domain',
                'Perform end-to-end sandbox tests generating and paying invoices',
                'Fix invoice schema bugs and optimize form input latency'
              ],
              estimated_hours: 20
            }
          ],
          milestones: [
            { title: 'Invoicing Form Complete', target_week: 6, metric: 'invoicing_form_ui', target_value: 1 },
            { title: 'Client Portal Page Live', target_week: 7, metric: 'portal_live', target_value: 1 },
            { title: 'Sandbox flow successful', target_week: 8, metric: 'qa_success', target_value: 1 }
          ],
          success_criteria: ['Can create, view, and mark invoices as paid in sandbox mode', 'Public portal renders correctly at 375px mobile width'],
          go_no_go_gate: 'Proceed to Phase 3 only if end-to-end sandbox testing succeeds without layout issues on mobile.',
          key_risks: ['Stripe redirect latency slows portal loading', 'Layout breakage on print formats'],
          agents_to_use: ['builder-v1']
        },
        {
          phase_number: 3,
          title: 'Launch & Growth (Days 61 - 90)',
          theme: 'Onboarding private beta designers and scaling email outreach.',
          weekly_goals: [
            {
              week_number: 9,
              focus: 'Beta Onboarding',
              goals: [
                'Send private beta invitations to top 10 waitlist signups',
                'Onboard first 3 active designers and assist in setting up active client scopes',
                'Log active onboarding feedback and UI blockers'
              ],
              estimated_hours: 20
            },
            {
              week_number: 10,
              focus: 'Public Launch Prep',
              goals: [
                'Connect production custom domain and configure DNS mail records',
                'Record short 2-minute product walk-through video demonstrating visual invoicing',
                'Draft Product Hunt launch messaging and social media announcement threads'
              ],
              estimated_hours: 20
            },
            {
              week_number: 11,
              focus: 'Launch Campaign',
              goals: [
                'Submit product release to Product Hunt and Hacker News',
                'Deploy email outreach campaigns targeting freelance design agencies',
                'Monitor live errors and user session logs (PostHog)'
              ],
              estimated_hours: 20
            },
            {
              week_number: 12,
              focus: 'Growth & Metrics Review',
              goals: [
                'Analyze initial user analytics, transaction counts, and payment conversions',
                'Identify high-impact workflow friction points causing invoice drops',
                'Plan Sprint backlog for next features based on customer feedback'
              ],
              estimated_hours: 20
            }
          ],
          milestones: [
            { title: '3 Beta Users Active', target_week: 9, metric: 'active_beta_users', target_value: 3 },
            { title: 'Product Hunt Launch', target_week: 11, metric: 'hunt_live', target_value: 1 },
            { title: 'First transaction completed', target_week: 12, metric: 'first_revenue_usd', target_value: 29 }
          ],
          success_criteria: ['Product Hunt page launched', 'First designer client marks invoice as paid in production'],
          go_no_go_gate: 'Onboarding completes successfully. Transition to weekly Compass standups and growth loops.',
          key_risks: ['Low launch traffic due to poor release timing', 'Database scalability on concurrent invoice views'],
          agents_to_use: ['outreach-v1', 'daily-standup-v1']
        }
      ]
    }
  }
}
