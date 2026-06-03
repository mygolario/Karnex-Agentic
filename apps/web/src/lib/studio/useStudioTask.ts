'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { StudioTaskContext, SuggestionChip } from './types'
import { buildCtoGreeting } from './status-mappers'

interface UseStudioTaskResult {
  task: StudioTaskContext | null
  greeting: string | null
  suggestions: SuggestionChip[]
  loading: boolean
}

export function useStudioTask(taskId: string | null, founderId: string | null): UseStudioTaskResult {
  const supabase = createSupabaseBrowserClient()
  const [task, setTask] = useState<StudioTaskContext | null>(null)
  const [greeting, setGreeting] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<SuggestionChip[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!founderId) return

    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        if (taskId && !taskId.startsWith('mock-')) {
          const { data: row } = await supabase
            .from('tasks')
            .select('id, title, description, agent_config, category')
            .eq('id', taskId)
            .maybeSingle()

          if (cancelled) return

          if (row) {
            const ctx: StudioTaskContext = {
              id: row.id,
              title: row.title,
              description: row.description,
              agent_config: row.agent_config as Record<string, unknown> | null,
              category: row.category,
            }
            setTask(ctx)
            setGreeting(buildCtoGreeting(ctx))
          }
        } else if (taskId?.startsWith('mock-')) {
          setTask(null)
          setGreeting(null)
        } else {
          setTask(null)
          setGreeting(null)
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session || cancelled) return

        const { data: roadmap } = await supabase
          .from('roadmaps')
          .select('id')
          .eq('founder_id', session.user.id)
          .eq('is_active', true)
          .maybeSingle()

        if (!roadmap || cancelled) return

        const { data: sprint } = await supabase
          .from('sprints')
          .select('id')
          .eq('roadmap_id', roadmap.id)
          .eq('status', 'active')
          .maybeSingle()

        if (!sprint || cancelled) return

        const { data: buildTasks } = await supabase
          .from('tasks')
          .select('id, title, agent_config')
          .eq('sprint_id', sprint.id)
          .eq('category', 'build')
          .in('status', ['todo', 'in_progress'])
          .order('priority')
          .limit(3)

        if (cancelled) return

        const chips: SuggestionChip[] = (buildTasks ?? []).map((t) => {
          const config = (t.agent_config ?? {}) as Record<string, unknown>
          const pre = config.pre_populated_input as Record<string, unknown> | undefined
          return {
            id: t.id,
            label: t.title,
            specification: (pre?.specification as string) || t.title,
          }
        })
        setSuggestions(chips)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [taskId, founderId, supabase])

  return { task, greeting, suggestions, loading }
}
