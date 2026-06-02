import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const rawBody = await req.text()
  const hmacHeader = req.headers.get('hmac') ?? ''

  // Step 1: Verify HMAC-SHA512 signature using MERCHANT_API_KEY as secret
  const computedHmac = createHmac('sha512', process.env.OXAPAY_MERCHANT_API_KEY!)
    .update(rawBody)
    .digest('hex')

  if (computedHmac !== hmacHeader) {
    return new Response('Invalid HMAC signature', { status: 400 })
  }

  // Step 2: Parse payload
  const payload = JSON.parse(rawBody)
  const { track_id, status, type, order_id, amount, currency, date } = payload

  // Step 3: Only process invoice type (ignore payout webhooks)
  if (type !== 'invoice') {
    return new Response('ok', { status: 200 })
  }

  // Step 4: Idempotency check — reject if already processed as Paid
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, status')
    .eq('oxapay_track_id', track_id)
    .single()

  if (existingPayment?.status === 'confirmed') {
    return new Response('ok', { status: 200 }) // Already processed, return 200
  }

  // Step 5: Replay attack prevention — reject payloads older than 10 minutes
  const payloadAge = Math.floor(Date.now() / 1000) - date
  if (payloadAge > 600) {
    return new Response('Payload too old', { status: 400 })
  }

  // Step 6: Handle "Paying" status — log it, do NOT activate subscription
  if (status === 'Paying') {
    await supabase.from('payments').upsert({
      oxapay_track_id: track_id,
      oxapay_order_id: order_id,
      amount_usd: amount,
      currency: currency,
      status: 'confirming',
      raw_webhook_payload: payload,
      webhook_received_at: new Date().toISOString(),
    }, { onConflict: 'oxapay_track_id' })

    return new Response('ok', { status: 200 })
  }

  // Step 7: Handle "Paid" status — activate subscription
  if (status === 'Paid') {
    // Parse founder_id and plan from order_id (format: karnex_{plan}_{founderId}_{timestamp})
    const [, plan, founderId] = order_id.split('_')

    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Update payment record
    await supabase.from('payments').upsert({
      oxapay_track_id: track_id,
      oxapay_order_id: order_id,
      founder_id: founderId,
      amount_usd: amount,
      currency: currency,
      status: 'confirmed',
      plan: plan,
      period_start: now.toISOString(),
      period_end: expiresAt.toISOString(),
      raw_webhook_payload: payload,
      webhook_received_at: now.toISOString(),
    }, { onConflict: 'oxapay_track_id' })

    let tasksLimit = 100
    if (plan === 'builder') tasksLimit = 500
    else if (plan === 'founder') tasksLimit = 999999
    else if (plan === 'studio') tasksLimit = 999999

    // Activate or renew subscription
    await supabase.from('subscriptions').upsert({
      founder_id: founderId,
      plan: plan,
      status: 'active',
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      renewed_at: now.toISOString(),
      tasks_used_this_cycle: 0,
      tasks_limit: tasksLimit,
    }, { onConflict: 'founder_id' })

    return new Response('ok', { status: 200 })
  }

  // All other statuses — log and return 200 so OxaPay doesn't retry
  return new Response('ok', { status: 200 })
}
