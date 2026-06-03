import type { AutomationRule, AutomationRecipeCatalog } from '@/types/database'

export const KARNEX_HUB_PROVIDER = 'karnex_hub' as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

export async function loadRecipeCatalog(
  supabase: SupabaseLike
): Promise<AutomationRecipeCatalog[]> {
  const { data, error } = await supabase
    .from('automation_recipe_catalog')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Failed to load recipe catalog:', error)
    return getFallbackCatalog()
  }
  return (data ?? []) as AutomationRecipeCatalog[]
}

export async function ensureKarnexHubRow(
  supabase: SupabaseLike,
  founderId: string
): Promise<{ automation_rules: AutomationRule[] }> {
  const { data: existing } = await supabase
    .from('integrations')
    .select('id, automation_rules')
    .eq('founder_id', founderId)
    .eq('provider', KARNEX_HUB_PROVIDER)
    .maybeSingle()

  if (existing) {
    return {
      automation_rules: parseAutomationRules(existing.automation_rules),
    }
  }

  const { data: created, error } = await supabase
    .from('integrations')
    .upsert({
      founder_id: founderId,
      provider: KARNEX_HUB_PROVIDER,
      status: 'active',
      automation_rules: [],
      metadata: {},
    })
    .select('automation_rules')
    .single()

  if (error) {
    console.error('Failed to ensure karnex_hub row:', error)
    return { automation_rules: [] }
  }
  return { automation_rules: parseAutomationRules(created?.automation_rules) }
}

export function parseAutomationRules(raw: unknown): AutomationRule[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((r): r is AutomationRule => {
      return (
        typeof r === 'object' &&
        r !== null &&
        'recipe_id' in r &&
        typeof (r as AutomationRule).recipe_id === 'string'
      )
    })
    .map((r) => ({
      recipe_id: r.recipe_id,
      enabled: Boolean(r.enabled),
      updated_at: r.updated_at,
    }))
}

export function isRecipeEnabled(
  rules: AutomationRule[],
  recipeId: string
): boolean {
  return rules.find((r) => r.recipe_id === recipeId)?.enabled ?? false
}

export async function setRecipeEnabled(
  supabase: SupabaseLike,
  founderId: string,
  recipeId: string,
  enabled: boolean
): Promise<AutomationRule[]> {
  const { automation_rules: current } = await ensureKarnexHubRow(supabase, founderId)
  const next: AutomationRule[] = [
    ...current.filter((r) => r.recipe_id !== recipeId),
    { recipe_id: recipeId, enabled, updated_at: new Date().toISOString() },
  ]

  const { error } = await supabase
    .from('integrations')
    .update({ automation_rules: next })
    .eq('founder_id', founderId)
    .eq('provider', KARNEX_HUB_PROVIDER)

  if (error) throw error
  return next
}

export function checkRequirementsMet(
  recipe: AutomationRecipeCatalog,
  connectedProviders: Set<string>,
  platformResendOk: boolean
): boolean {
  return recipe.required_providers.every((p) => {
    if (p === 'resend') return platformResendOk
    return connectedProviders.has(p)
  })
}

function getFallbackCatalog(): AutomationRecipeCatalog[] {
  return [
    {
      id: 'build_and_ship',
      title: 'Build & Ship',
      trigger_description: 'Builder Agent completes a task',
      action_description: 'Create GitHub PR + send email notification',
      required_providers: ['github', 'resend'],
      trigger_type: 'event',
      trigger_config: { event: 'builder_task_complete' },
      sort_order: 1,
    },
    {
      id: 'morning_brief',
      title: 'Morning Brief',
      trigger_description: "8am daily (founder's timezone)",
      action_description: "Send summary of today's sprint tasks to email",
      required_providers: ['resend'],
      trigger_type: 'schedule',
      trigger_config: { hour: 8, minute: 0 },
      sort_order: 2,
    },
    {
      id: 'momentum_alert',
      title: 'Momentum Alert',
      trigger_description: 'Momentum Score drops below 40 for 2+ days',
      action_description: 'Trigger Accountability Agent + send nudge email',
      required_providers: ['resend'],
      trigger_type: 'condition',
      trigger_config: { metric: 'momentum_score', threshold: 40, consecutive_days: 2 },
      sort_order: 3,
    },
    {
      id: 'outreach_review',
      title: 'Outreach Review',
      trigger_description: 'Outreach Agent drafts a campaign',
      action_description: 'Queue for review at 9am the next day',
      required_providers: ['resend'],
      trigger_type: 'event',
      trigger_config: { event: 'outreach_campaign_drafted' },
      sort_order: 4,
    },
    {
      id: 'weekly_debrief_auto',
      title: 'Weekly Debrief Auto',
      trigger_description: "Friday 5pm (founder's timezone)",
      action_description: 'Auto-run Weekly Debrief Agent + email the summary',
      required_providers: ['resend'],
      trigger_type: 'schedule',
      trigger_config: { hour: 17, minute: 0, days: ['fri'] },
      sort_order: 5,
    },
  ]
}
