import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface CatalogModel {
  id: string
  display_name: string
  openrouter_model: string
  tier: string
  max_tokens?: number
  badge?: string
  role?: string
  thinking?: boolean
  best_for?: string
}

function loadCatalog(): { version: string; default_model_id: string; models: CatalogModel[] } {
  const catalogPath = path.join(
    process.cwd(),
    '..',
    '..',
    'services',
    'agents',
    'forge',
    'models.catalog.json'
  )
  const altPath = path.join(process.cwd(), 'services', 'agents', 'forge', 'models.catalog.json')
  const resolved = fs.existsSync(catalogPath) ? catalogPath : altPath
  const raw = fs.readFileSync(resolved, 'utf-8')
  return JSON.parse(raw) as { version: string; default_model_id: string; models: CatalogModel[] }
}

async function loadFavorites(founderId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('founder_memory')
    .select('value')
    .eq('founder_id', founderId)
    .eq('namespace', 'forge')
    .eq('key', 'model_favorites')
    .maybeSingle()

  const value = data?.value as { ids?: string[] } | null
  return Array.isArray(value?.ids) ? value.ids : []
}

async function fetchOpenRouterModels(): Promise<CatalogModel[]> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return []

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const json = await res.json()
    const list = (json.data || []) as Array<{ id: string; name?: string }>
    return list
      .filter((m) => /gemini|claude|gpt|llama/i.test(m.id))
      .slice(0, 40)
      .map((m) => ({
        id: `or-${m.id.replace(/[/]/g, '-')}`,
        display_name: m.name || m.id,
        openrouter_model: m.id,
        tier: 'Medium',
        best_for: 'OpenRouter catalog',
      }))
  } catch {
    return []
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const syncOpenRouter = searchParams.get('sync') === '1'

  try {
    const catalog = loadCatalog()
    let models = [...catalog.models]

    if (syncOpenRouter) {
      const extra = await fetchOpenRouterModels()
      const ids = new Set(models.map((m) => m.openrouter_model))
      for (const m of extra) {
        if (!ids.has(m.openrouter_model)) {
          models.push(m)
          ids.add(m.openrouter_model)
        }
      }
    }

    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    let favorites: string[] = []
    if (user) {
      favorites = await loadFavorites(user.id)
    }

    const withLabels = models.map((m) => ({
      ...m,
      label: `${m.display_name} (${m.tier})`,
      is_favorite: favorites.includes(m.id),
    }))

    return NextResponse.json({
      version: catalog.version,
      default_model_id: catalog.default_model_id,
      models: withLabels,
      favorites,
    })
  } catch (e) {
    console.error('forge/models catalog load failed', e)
    return NextResponse.json(
      {
        version: '1.0.0',
        default_model_id: 'karnex-forge-fast-high',
        models: [],
        favorites: [],
      },
      { status: 200 }
    )
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const favorites = Array.isArray(body.favorites) ? (body.favorites as string[]) : []

  const { error } = await supabase.from('founder_memory').upsert(
    {
      founder_id: user.id,
      namespace: 'forge',
      key: 'model_favorites',
      value: { ids: favorites.slice(0, 20) },
      tags: ['forge', 'model-favorites'],
    },
    { onConflict: 'founder_id,namespace,key' }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, favorites })
}
