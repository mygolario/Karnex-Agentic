import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan } = await req.json()
    if (!plan || !['starter', 'builder', 'founder', 'studio'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan selection' }, { status: 400 })
    }

    // Determine price based on selected tier
    let price = 29
    if (plan === 'builder') price = 79
    else if (plan === 'founder') price = 149
    else if (plan === 'studio') price = 299

    const orderId = `karnex_${plan}_${user.id}_${Date.now()}`

    // Call OxaPay invoice creation API
    const response = await fetch('https://api.oxapay.com/v1/payment/invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: process.env.OXAPAY_MERCHANT_API_KEY,
        amount: price,
        currency: 'USD',
        order_id: orderId,
        email: user.email,
        callback_url: process.env.NEXT_PUBLIC_OXAPAY_CALLBACK_URL,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
        sandbox: process.env.NEXT_PUBLIC_OXAPAY_SANDBOX === 'true'
      })
    })

    const data = await response.json()
    if (data.status !== 1) {
      return NextResponse.json({ error: data.message || 'Failed to initialize payment gateway' }, { status: 500 })
    }

    return NextResponse.json({ payLink: data.payLink })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Checkout error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
