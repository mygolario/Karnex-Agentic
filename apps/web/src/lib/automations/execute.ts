import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  parseAutomationRules,
  isRecipeEnabled,
  checkRequirementsMet,
  KARNEX_HUB_PROVIDER,
} from '@/lib/integrations/recipes'
import type { AutomationRecipeCatalog } from '@/types/database'
import { env } from '@/lib/env'

function getServiceSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service credentials not configured')
  return createClient(url, key)
}

async function sendResendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.warn('[automation] RESEND_API_KEY not set; skipping email')
    return false
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Karnex <notifications@arioai.site>',
      to: [to],
      subject,
      html,
    }),
  })
  return res.ok
}

async function logAutomation(
  supabase: SupabaseClient,
  params: {
    founder_id: string
    integration_id: string | null
    rule_name: string
    trigger_event: string
    action_taken: string
    status: 'triggered' | 'success' | 'failed'
    metadata?: Record<string, unknown>
  }
) {
  await supabase.from('automation_logs').insert({
    founder_id: params.founder_id,
    integration_id: params.integration_id,
    rule_name: params.rule_name,
    trigger_event: params.trigger_event,
    action_taken: params.action_taken,
    status: params.status,
    metadata: params.metadata ?? {},
  })
}

export async function runAutomationTrigger(params: {
  founder_id: string
  recipe_id: string
  trigger_event: string
  metadata?: Record<string, unknown>
}): Promise<{ ok: boolean; reason?: string }> {
  const supabase = getServiceSupabase()

  const { data: catalogRow } = await supabase
    .from('automation_recipe_catalog')
    .select('*')
    .eq('id', params.recipe_id)
    .maybeSingle()

  const recipe = catalogRow as AutomationRecipeCatalog | null
  if (!recipe) {
    return { ok: false, reason: 'unknown_recipe' }
  }

  const { data: hub } = await supabase
    .from('integrations')
    .select('id, automation_rules')
    .eq('founder_id', params.founder_id)
    .eq('provider', KARNEX_HUB_PROVIDER)
    .maybeSingle()

  const rules = parseAutomationRules(hub?.automation_rules)
  if (!isRecipeEnabled(rules, params.recipe_id)) {
    return { ok: false, reason: 'recipe_disabled' }
  }

  const { data: integrations } = await supabase
    .from('integrations')
    .select('provider, status')
    .eq('founder_id', params.founder_id)
    .eq('status', 'active')

  const connected = new Set(
    integrations?.map((i) => i.provider).filter(Boolean) ?? []
  )
  const platformResendOk = Boolean(env.RESEND_API_KEY?.trim())

  if (!checkRequirementsMet(recipe, connected, platformResendOk)) {
    return { ok: false, reason: 'requirements_not_met' }
  }

  const { data: founder } = await supabase
    .from('founders')
    .select('full_name, momentum_score')
    .eq('id', params.founder_id)
    .single()

  const { data: authUser } = await supabase.auth.admin.getUserById(
    params.founder_id
  )
  const email = authUser?.user?.email
  if (!email) {
    return { ok: false, reason: 'no_founder_email' }
  }

  await logAutomation(supabase, {
    founder_id: params.founder_id,
    integration_id: hub?.id ?? null,
    rule_name: recipe.title,
    trigger_event: params.trigger_event,
    action_taken: 'started',
    status: 'triggered',
    metadata: params.metadata,
  })

  let actionTaken = ''
  let success = false

  try {
    switch (params.recipe_id) {
      case 'momentum_alert': {
        const score = founder?.momentum_score ?? 50
        if (score >= 40) {
          return { ok: false, reason: 'momentum_above_threshold' }
        }
        const subject = 'Momentum check-in from Karnex'
        const html = `<p>Hi ${founder?.full_name ?? 'there'},</p><p>Your Momentum Score has been below 40. Here's a 15-minute restart task: review today's top priority in Karnex and complete one small action.</p>`
        success = await sendResendEmail(email, subject, html)
        actionTaken = 'accountability_nudge_email'
        break
      }
      case 'morning_brief': {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('title, status, category')
          .eq('founder_id', params.founder_id)
          .in('status', ['todo', 'in_progress'])
          .limit(10)

        const list =
          tasks?.map((t) => `• ${t.title} (${t.status})`).join('<br>') ??
          'No open tasks — great time to plan your sprint.'
        success = await sendResendEmail(
          email,
          'Your Morning Brief',
          `<p>Good morning, ${founder?.full_name ?? 'founder'}.</p><p><strong>Today's focus:</strong></p><p>${list}</p>`
        )
        actionTaken = 'morning_brief_email'
        break
      }
      case 'weekly_debrief_auto': {
        success = await sendResendEmail(
          email,
          'Weekly Debrief',
          `<p>Hi ${founder?.full_name ?? 'there'},</p><p>Your weekly debrief is ready. Open Karnex Home to review momentum, streak, and sprint progress.</p>`
        )
        actionTaken = 'weekly_debrief_email'
        break
      }
      case 'build_and_ship': {
        const prUrl =
          (params.metadata?.pr_url as string) ??
          (params.metadata?.preview_url as string) ??
          ''
        success = await sendResendEmail(
          email,
          'Build complete — review your PR',
          `<p>Builder Agent finished a task.</p>${prUrl ? `<p><a href="${prUrl}">View changes</a></p>` : '<p>Check GitHub for the new branch.</p>'}`
        )
        actionTaken = 'build_ship_notification'
        break
      }
      case 'outreach_review': {
        success = await sendResendEmail(
          email,
          'Outreach draft ready for review',
          `<p>An outreach campaign was drafted and is queued for your 9am review.</p>`
        )
        actionTaken = 'outreach_review_queued'
        break
      }
      default:
        return { ok: false, reason: 'unhandled_recipe' }
    }
  } catch (err) {
    console.error('Automation execution error:', err)
    await logAutomation(supabase, {
      founder_id: params.founder_id,
      integration_id: hub?.id ?? null,
      rule_name: recipe.title,
      trigger_event: params.trigger_event,
      action_taken: 'execution_error',
      status: 'failed',
      metadata: { error: String(err) },
    })
    return { ok: false, reason: 'execution_failed' }
  }

  await logAutomation(supabase, {
    founder_id: params.founder_id,
    integration_id: hub?.id ?? null,
    rule_name: recipe.title,
    trigger_event: params.trigger_event,
    action_taken: actionTaken,
    status: success ? 'success' : 'failed',
    metadata: params.metadata,
  })

  return { ok: success, reason: success ? undefined : 'action_failed' }
}
