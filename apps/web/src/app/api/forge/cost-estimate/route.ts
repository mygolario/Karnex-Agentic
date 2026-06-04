import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Rough client-side cost mirror when agent service unavailable */
export async function POST(request: Request) {
  const body = await request.json()
  const spec = String(body.specification || '')
  const maxMode = Boolean(body.max_mode)
  const mode = String(body.mode || 'auto')

  let tokens = 8000
  if (maxMode) tokens = 24000
  if (mode === 'build' || mode === 'auto') tokens += Math.min(spec.length * 8, 32000)

  const rate = maxMode ? 0.6 : 0.35
  const usdLow = Math.round((tokens / 1_000_000) * rate * 0.7 * 1000) / 1000
  const usdHigh = Math.round((tokens / 1_000_000) * rate * 1.4 * 1000) / 1000

  return NextResponse.json({
    estimated_tokens: tokens,
    usd_range: [usdLow, Math.max(usdHigh, usdLow + 0.01)],
    disclaimer: 'Estimate only; actual OpenRouter usage may vary.',
  })
}
