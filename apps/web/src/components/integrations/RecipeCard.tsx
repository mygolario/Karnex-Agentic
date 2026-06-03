'use client'

import type { AutomationRecipeCatalog } from '@/types/database'

interface RecipeCardProps {
  recipe: AutomationRecipeCatalog
  enabled: boolean
  requirementsMet: boolean
  toggling?: boolean
  onToggle: (enabled: boolean) => void
}

const providerLabels: Record<string, string> = {
  github: 'GitHub',
  gmail: 'Gmail',
  resend: 'Resend',
  vercel: 'Vercel',
}

export function RecipeCard({
  recipe,
  enabled,
  requirementsMet,
  toggling = false,
  onToggle,
}: RecipeCardProps) {
  const canEnable = requirementsMet

  return (
    <div
      className={`border rounded-2xl p-5 space-y-4 transition-colors ${
        requirementsMet
          ? 'border-[#1a1a1a] bg-[#050505] hover:border-[#262626]'
          : 'border-amber-500/20 bg-amber-500/[0.02]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <h3 className="text-[15px] font-bold text-white">{recipe.title}</h3>
          <div className="space-y-1">
            <p className="text-[12px] text-[#525252]">
              <span className="text-[#737373] font-medium">Trigger: </span>
              {recipe.trigger_description}
            </p>
            <p className="text-[12px] text-[#525252]">
              <span className="text-[#737373] font-medium">Action: </span>
              {recipe.action_description}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={!canEnable || toggling}
          onClick={() => onToggle(!enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
            enabled ? 'bg-[#6366f1]' : 'bg-[#1a1a1a]'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {recipe.required_providers.map((p) => (
          <span
            key={p}
            className="text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full border border-[#6366f1]/20 bg-[#6366f1]/10 text-[#6366f1]"
          >
            {providerLabels[p] ?? p}
          </span>
        ))}
      </div>

      {!requirementsMet && (
        <p className="text-[12px] text-amber-400 font-medium">Requirements not met</p>
      )}
    </div>
  )
}
