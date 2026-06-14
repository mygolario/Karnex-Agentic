import { NextRequest, NextResponse } from 'next/server'

interface Phase {
  phase_number: number
  title: string
  theme: string
  weekly_goals: {
    week_number: number
    focus: string
    goals: string[]
    estimated_hours: number
  }[]
}

interface AnalysisResult {
  startupName: string
  tagline: string
  industry: string
  targetAudience: string
  stage: 'ideation' | 'validation' | 'building' | 'launching' | 'growing'
  roadmap: {
    title: string
    phases: Phase[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const { description, fullName, weeklyHoursAvailable } = await request.json()

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const targetHours = weeklyHoursAvailable || 20
    const apiKey = process.env.OPENROUTER_API_KEY
    const isMockKey = !apiKey || apiKey.includes('your_gemini_api_key_here') || apiKey.startsWith('sk-or-v1-d06c7a')

    if (!isMockKey) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'Karnex Onboarding',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            response_format: { type: 'json_object' },
            max_tokens: 4096,
            messages: [
              {
                role: 'system',
                content: `You are Karnex, an elite AI Co-Founder. Analyze the user's startup idea description and return a structured JSON object containing a personalized workspace proposal.
You must personalize the entire proposal:
- The suggested name must be creative, distinct, and highly relevant.
- The 90-Day Roadmap must be deeply contextualized to their target industry and the specific workflow/validation requirements for their idea. Do not generate generic placeholders.
- Enforce the founder's weekly capacity limit of exactly ${targetHours} hours for estimated_hours per week in all roadmap goals. Make sure goals are realistically achievable within this limit.

You must return a JSON object with this exact typescript structure:
{
  "startupName": string (creative name suggestion, or keep it if they specify a name),
  "tagline": string (highly catchy, 5-8 words tagline),
  "industry": string (primary market sector, e.g. SaaS, FinTech, DevTools, AI),
  "targetAudience": string (who the customers are),
  "stage": "ideation" | "validation" | "building" | "launching" | "growing" (select one),
  "roadmap": {
    "title": "90-Day Personalized Roadmap",
    "phases": [
      {
        "phase_number": 1,
        "title": string (Phase 1 title),
        "theme": string (core theme of Phase 1),
        "weekly_goals": [
          {
            "week_number": 1,
            "focus": string,
            "goals": string[] (3 actionable bullet goals),
            "estimated_hours": ${targetHours}
          },
          {
            "week_number": 2,
            "focus": string,
            "goals": string[] (3 actionable bullet goals),
            "estimated_hours": ${targetHours}
          },
          {
            "week_number": 3,
            "focus": string,
            "goals": string[] (3 actionable bullet goals),
            "estimated_hours": ${targetHours}
          },
          {
            "week_number": 4,
            "focus": string,
            "goals": string[] (3 actionable bullet goals),
            "estimated_hours": ${targetHours}
          }
        ]
      },
      {
        "phase_number": 2,
        "title": string (Phase 2 title),
        "theme": string (core theme of Phase 2),
        "weekly_goals": [
          {
            "week_number": 5,
            "focus": string,
            "goals": string[] (3 actionable bullet goals),
            "estimated_hours": ${targetHours}
          },
          {
            "week_number": 6,
            "focus": string,
            "goals": string[] (3 actionable bullet goals),
            "estimated_hours": ${targetHours}
          },
          {
            "week_number": 7,
            "focus": string,
            "goals": string[] (3 actionable bullet goals),
            "estimated_hours": ${targetHours}
          },
          {
            "week_number": 8,
            "focus": string,
            "goals": string[] (3 actionable bullet goals),
            "estimated_hours": ${targetHours}
          }
        ]
      },
      {
        "phase_number": 3,
        "title": string (Phase 3 title),
        "theme": string (core theme of Phase 3),
        "weekly_goals": [
          {
            "week_number": 9,
            "focus": string,
            "goals": string[] (3 actionable bullet goals),
            "estimated_hours": ${targetHours}
          },
          {
            "week_number": 10,
            "focus": string,
            "goals": string[] (3 actionable bullet goals),
            "estimated_hours": ${targetHours}
          },
          {
            "week_number": 11,
            "focus": string,
            "goals": string[] (3 actionable bullet goals),
            "estimated_hours": ${targetHours}
          },
          {
            "week_number": 12,
            "focus": string,
            "goals": string[] (3 actionable bullet goals),
            "estimated_hours": ${targetHours}
          }
        ]
      }
    ]
  }
}`
              },
              {
                role: 'user',
                content: `Startup Idea Description: "${description}"\nFounder Name: "${fullName || 'Founder'}"`
              }
            ],
            temperature: 0.7
          })
        })

        if (response.ok) {
          const data = await response.json()
          const text = data.choices?.[0]?.message?.content
          if (text) {
            const parsed = JSON.parse(text) as AnalysisResult
            return NextResponse.json(parsed)
          }
        }
      } catch (err) {
        console.warn('OpenRouter call failed, falling back to dynamic mockup generator:', err)
      }
    }

    // Dynamic Mockup Fallback (High Quality, parses the user's idea to make it highly relevant)
    const fallbackData = generateDynamicFallback(description, fullName, targetHours)
    return NextResponse.json(fallbackData)

  } catch (error) {
    console.error('Error in onboarding analyze API:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

function generateDynamicFallback(description: string, fullName: string, weeklyHoursAvailable: number): AnalysisResult {
  const descLower = description.toLowerCase()
  let suggestedName = "Karnex Venture"
  let tagline = "Building the future of digital products."
  let industry = "SaaS"
  let targetAudience = "Early-stage founders and builders"
  let stage: 'ideation' | 'validation' | 'building' | 'launching' | 'growing' = 'ideation'

  // Extract simple keywords to personalize the mock response
  if (descLower.includes('invoice') || descLower.includes('billing') || descLower.includes('payment')) {
    suggestedName = "BillFlow AI"
    tagline = "Frictionless invoice automation for creators and freelancers."
    industry = "Fintech"
    targetAudience = "Freelancers and agency owners"
    stage = 'validation'
  } else if (descLower.includes('marketing') || descLower.includes('social') || descLower.includes('outreach')) {
    suggestedName = "GrowthEngine AI"
    tagline = "Hyper-personalized marketing campaigns in one click."
    industry = "Martech / AI"
    targetAudience = "Growth marketers and solo founders"
    stage = 'ideation'
  } else if (descLower.includes('code') || descLower.includes('developer') || descLower.includes('api')) {
    suggestedName = "DevForge AI"
    tagline = "Autonomous code architecture and schema generator."
    industry = "DevTools"
    targetAudience = "Software engineers and tech leads"
    stage = 'building'
  } else if (descLower.includes('health') || descLower.includes('fitness') || descLower.includes('gym')) {
    suggestedName = "AuraFit"
    tagline = "AI-powered biometric coaching and nutrition plans."
    industry = "Healthtech"
    targetAudience = "Fitness enthusiasts and personal trainers"
    stage = 'ideation'
  } else if (descLower.includes('shop') || descLower.includes('e-commerce') || descLower.includes('sell')) {
    suggestedName = "CartSmart AI"
    tagline = "Automate custom storefront layouts and checkout logic."
    industry = "E-commerce"
    targetAudience = "D2C brands and Shopify store owners"
    stage = 'building'
  }

  // Parse if user specified a name (e.g. "I want to build called X" or "X is a platform")
  const nameMatch = description.match(/(?:called|named|name is)\s+([A-Z][a-zA-Z0-9\s_-]{1,15})/i)
  if (nameMatch && nameMatch[1]) {
    suggestedName = nameMatch[1].trim()
  }

  return {
    startupName: suggestedName,
    tagline,
    industry,
    targetAudience,
    stage,
    roadmap: {
      title: "90-Day Personalized Roadmap",
      phases: [
        {
          phase_number: 1,
          title: "Concept Refinement & Validation",
          theme: "Validating user pain points and crystallizing core features.",
          weekly_goals: [
            {
              week_number: 1,
              focus: "Customer Research",
              goals: [
                "Conduct 5 discovery interviews with target users",
                "Define the top 3 high-intensity user pain points",
                "Draft initial product value proposition document"
              ],
              estimated_hours: weeklyHoursAvailable
            },
            {
              week_number: 2,
              focus: "Wedge Definition",
              goals: [
                "Identify the core features needed for the MVP",
                "Conduct competitive analysis mapping 3 key competitors",
                "Select primary launch channel strategy"
              ],
              estimated_hours: weeklyHoursAvailable
            },
            {
              week_number: 3,
              focus: "Landing Page Test",
              goals: [
                "Deploy a high-converting landing page with a waitlist",
                "Set up basic conversion metrics monitoring (e.g. PostHog)",
                "Drive 100 targeted visitors to the landing page"
              ],
              estimated_hours: weeklyHoursAvailable
            },
            {
              week_number: 4,
              focus: "Validation Review",
              goals: [
                "Analyze waitlist conversion rate and signups",
                "Formulate 3 product-market validation hypotheses",
                "Conduct War Room planning loop to review feedback"
              ],
              estimated_hours: weeklyHoursAvailable
            }
          ]
        },
        {
          phase_number: 2,
          title: "MVP Development Sequence",
          theme: "Building the core functional application layers.",
          weekly_goals: [
            {
              week_number: 5,
              focus: "Database & Core Schema",
              goals: [
                "Design normalized database tables and indexes",
                "Set up Supabase authentication and access controls",
                "Write basic server functions to process data"
              ],
              estimated_hours: weeklyHoursAvailable
            },
            {
              week_number: 6,
              focus: "Core Application Logic",
              goals: [
                "Develop the primary dashboards and user interfaces",
                "Integrate external AI model endpoints (Gemini/OpenRouter)",
                "Connect core logical handlers to state providers"
              ],
              estimated_hours: weeklyHoursAvailable
            },
            {
              week_number: 7,
              focus: "Integrations & API Hookup",
              goals: [
                "Configure third-party service provider integrations",
                "Implement stripe/oxapay payment transaction routes",
                "Conduct internal end-to-end integration dry runs"
              ],
              estimated_hours: weeklyHoursAvailable
            },
            {
              week_number: 8,
              focus: "Internal QA & Debugging",
              goals: [
                "Run functional validation tests across core app flows",
                "Optimize API latency and database query speeds",
                "Fix top blocker bugs and improve UI micro-interactions"
              ],
              estimated_hours: weeklyHoursAvailable
            }
          ]
        },
        {
          phase_number: 3,
          title: "Launch & Growth Loop",
          theme: "Going live to waitlist and driving initial transactions.",
          weekly_goals: [
            {
              week_number: 9,
              focus: "Beta User Onboarding",
              goals: [
                "Invite top 10 waitlist members into private beta",
                "Create feedback channel for reporting bugs and suggestions",
                "Deploy hotfixes based on beta user feedback"
              ],
              estimated_hours: weeklyHoursAvailable
            },
            {
              week_number: 10,
              focus: "Public Launch Prep",
              goals: [
                "Write launch copy for Product Hunt, Hacker News, & X",
                "Create demo video walk-through demonstrating features",
                "Configure production deployment domains and certificates"
              ],
              estimated_hours: weeklyHoursAvailable
            },
            {
              week_number: 11,
              focus: "Launch Campaign",
              goals: [
                "Publish launch announcements across all channels",
                "Run outbound outreach campaigns targeting first users",
                "Coordinate community support for product release"
              ],
              estimated_hours: weeklyHoursAvailable
            },
            {
              week_number: 12,
              focus: "Analytics & Scaling",
              goals: [
                "Review post-launch traction metrics and funnel drop-offs",
                "Identify high-impact scaling bottlenecks",
                "Outline Sprint plan for Phase 4 validation"
              ],
              estimated_hours: weeklyHoursAvailable
            }
          ]
        }
      ]
    }
  }
}
