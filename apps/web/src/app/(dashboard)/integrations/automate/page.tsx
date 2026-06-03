'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { RecipeCard } from '@/components/integrations/RecipeCard'
import {
  loadRecipeCatalog,
  ensureKarnexHubRow,
  isRecipeEnabled,
  setRecipeEnabled,
  checkRequirementsMet,
} from '@/lib/integrations/recipes'
import { KARNEX_HUB_PROVIDER } from '@/lib/integrations/recipes'
import type { AutomationRecipeCatalog, AutomationRule } from '@/types/database'

export default function IntegrationsAutomatePage() {
  return (
    <ErrorBoundary>
      <AutomateContent />
    </ErrorBoundary>
  )
}

function AutomateContent() {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [catalog, setCatalog] = useState<AutomationRecipeCatalog[]>([])
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [connectedProviders, setConnectedProviders] = useState<Set<string>>(new Set())
  const [platformResendOk, setPlatformResendOk] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const [recipes, hub, integrationsRes, resendRes] = await Promise.all([
        loadRecipeCatalog(supabase),
        ensureKarnexHubRow(supabase, session.user.id),
        supabase
          .from('integrations')
          .select('provider, status')
          .eq('founder_id', session.user.id)
          .eq('status', 'active')
          .neq('provider', KARNEX_HUB_PROVIDER),
        fetch('/api/integrations/resend/status'),
      ])

      setCatalog(recipes)
      setRules(hub.automation_rules)

      const connected = new Set<string>()
      integrationsRes.data?.forEach((row) => {
        if (row.provider) connected.add(row.provider)
      })
      setConnectedProviders(connected)

      if (resendRes.ok) {
        const body = (await resendRes.json()) as { active?: boolean }
        setPlatformResendOk(Boolean(body.active))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  const handleToggle = async (recipeId: string, enabled: boolean) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return

    setTogglingId(recipeId)
    try {
      const next = await setRecipeEnabled(
        supabase,
        session.user.id,
        recipeId,
        enabled
      )
      setRules(next)
    } catch (err) {
      console.error(err)
    } finally {
      setTogglingId(null)
    }
  }

  if (loading) {
    return (
      <p className="text-[13px] text-[#525252] py-8 text-center">Loading recipes…</p>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-label mb-2">Level 2 — Automate</h2>
        <p className="text-[13px] text-[#737373]">
          Opinionated recipes only — toggle automations when required integrations are connected.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {catalog.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            enabled={isRecipeEnabled(rules, recipe.id)}
            requirementsMet={checkRequirementsMet(
              recipe,
              connectedProviders,
              platformResendOk
            )}
            toggling={togglingId === recipe.id}
            onToggle={(enabled) => handleToggle(recipe.id, enabled)}
          />
        ))}
      </div>

      {catalog.length === 0 && (
        <p className="text-[13px] text-[#525252] text-center py-8">
          No recipes available. Run database migrations to seed the catalog.
        </p>
      )}
    </div>
  )
}
