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
        'Content-Type': 'application/json',
        'merchant_api_key': process.env.OXAPAY_MERCHANT_API_KEY || ''
      },
      body: JSON.stringify({
        amount: price,
        currency: 'USD',
        orderId: orderId,
        email: user.email,
        callbackUrl: process.env.NEXT_PUBLIC_OXAPAY_CALLBACK_URL,
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
        sandbox: process.env.NEXT_PUBLIC_OXAPAY_SANDBOX === 'true'
      })
    })

    const data = await response.json()
    console.log('OxaPay invoice response:', data)

    // Check success. OxaPay success can be indicated by response.ok and (status === 200 or result === 1)
    const isSuccess = response.ok && (
      data.status === 200 ||
      data.result === 1 ||
      (data.message && /success/i.test(data.message)) ||
      (typeof data.result === 'object' && data.result !== null) ||
      (typeof data.data === 'object' && data.data !== null)
    )

    if (!isSuccess) {
      const errorMsg = data.message || data.error || 'Failed to initialize payment gateway'
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }

    const payLink = data.payLink || data.paymentUrl || data.data?.payLink || data.data?.paymentUrl || data.result?.paymentUrl || data.result?.payLink
    if (!payLink) {
      return NextResponse.json({ error: 'Payment gateway link was not returned by provider' }, { status: 500 })
    }

    return NextResponse.json({ payLink })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Checkout error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
