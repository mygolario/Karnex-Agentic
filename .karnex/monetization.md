# Karnex — Monetization & Billing Architecture

> **Complete pricing, billing, metering, and revenue architecture.**

---

## Pricing Tiers

### Tier Breakdown

| Feature | Free Trial | Starter ($29/mo) | Builder ($79/mo) | Founder ($149/mo) | Studio ($299/mo) |
|---|---|---|---|---|---|
| **Duration** | 14 days | Ongoing | Ongoing | Ongoing | Ongoing |
| **Agent Tasks / Month** | 20 | 100 | 500 | Unlimited | Unlimited |
| **Dream Engine** (Layer 1) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pain-to-Product Transformer | ✅ | ✅ | ✅ | ✅ | ✅ |
| Idea Crystallizer | ✅ | ✅ | ✅ | ✅ | ✅ |
| ICP Definer | ✅ | ✅ | ✅ | ✅ | ✅ |
| Competitive Landscape | ✅ | ✅ | ✅ | ✅ | ✅ |
| Trend Radar | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Architect** (Layer 2) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 90-Day War Room | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sprint Planner | ✅ | ✅ | ✅ | ✅ | ✅ |
| Decision Journal | ❌ | ❌ | ✅ | ✅ | ✅ |
| Milestone Tracker | ❌ | ❌ | ✅ | ✅ | ✅ |
| Risk Radar | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Executor Pack** (Layer 3) | Limited | Limited | Full | Full | Full |
| Builder Agent | ✅ (3 runs) | ✅ | ✅ | ✅ | ✅ |
| Research Agent | ✅ | ✅ | ✅ | ✅ | ✅ |
| Outreach Agent | ❌ | ❌ | ✅ | ✅ | ✅ |
| Content & SEO Agent | ❌ | ❌ | ✅ | ✅ | ✅ |
| Sales Agent | ❌ | ❌ | ❌ | ✅ | ✅ |
| Design Agent | ❌ | ❌ | ✅ | ✅ | ✅ |
| Financial Modeling Agent | ❌ | ❌ | ❌ | ✅ | ✅ |
| Legal & Compliance Agent | ❌ | ❌ | ❌ | ✅ | ✅ |
| Fundraising Agent | ❌ | ❌ | ❌ | ✅ | ✅ |
| Analytics & Insight Agent | ❌ | ✅ (basic) | ✅ | ✅ | ✅ |
| **Compass** (Layer 4) | Limited | Limited | Full | Full | Full |
| Daily Standup | ✅ | ✅ | ✅ | ✅ | ✅ |
| Weekly Debrief | ❌ | ❌ | ✅ | ✅ | ✅ |
| Momentum Score | ✅ | ✅ | ✅ | ✅ | ✅ |
| Accountability Mode | ❌ | ❌ | ✅ | ✅ | ✅ |
| Mirror Agent | ❌ | ❌ | ❌ | ✅ | ✅ |
| Mentor Library | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Platform** | | | | | |
| Karnex Memory | ✅ | ✅ | ✅ | ✅ | ✅ |
| Integrations Hub | 1 integration | 3 integrations | All | All | All |
| Founder Vault | 100 MB | 500 MB | 2 GB | 10 GB | 50 GB |
| Agent Chaining | ❌ | Basic (2-step) | Full | Full | Full |
| **Multi-Project** | 1 project | 1 project | 1 project | 2 projects | 5 projects |
| **Team Seats** | 1 | 1 | 1 | 1 | 3 |
| **White-Label** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Priority Support** | ❌ | Email (48h) | Email (24h) | Email (12h) + Chat | Dedicated Slack |

---

## v1 Payment Processor: OxaPay

For the initial launch (v1), Karnex uses **OxaPay** as the primary payment processor. This allows global crypto payments without geo-restrictions, heavy compliance overhead, or merchant freezes. Traditional credit card billing via **Stripe [v2 - deferred]** is deferred to v2.

### Accepted Currencies (v1)
To eliminate crypto volatility risks for both Karnex and the founders, we accept **stablecoins only**:
- **USDT** (Tether USD) on TRC-20, ERC-20, and BSC (BEP-20) networks
- **USDC** (USD Coin) on ERC-20, Polygon, and Solana networks

Other currencies (BTC, ETH, LTC, BNB, TRX) are deferred to **[v2 - deferred]**.

### Pricing Structure
All plans are displayed and billed in USD-equivalent amounts:
- **Starter**: $29.00 USD/month in USDT/USDC equivalent
- **Builder**: $79.00 USD/month in USDT/USDC equivalent
- **Founder**: $149.00 USD/month in USDT/USDC equivalent
- **Studio**: $299.00 USD/month in USDT/USDC equivalent

---

## How Subscription Billing Works (v1 Manual Renewal Flow)

Since OxaPay does not natively support recurring pull payments (subscriptions) for crypto, Karnex hosts its own subscription state engine in Supabase and uses a manual renewal flow triggered by automated reminders.

```
┌─────────────────────────────────────────────────────────────┐
│                    Subscription Lifecycle Flow              │
│                                                             │
│ 1. Founder selects plan → Backend calls OxaPay Request API   │
│ 2. Founder redirected to hosted OxaPay invoice page         │
│ 3. Founder pays invoice with USDT/USDC                      │
│ 4. OxaPay calls webhook /api/webhooks/oxapay                │
│ 5. Webhook verifies HMAC-SHA512, sets status = 'active'     │
│    and expires_at = now + 30 days                           │
│ 6. Day 25 (5 days to expiry) → Automated Resend email with  │
│    new OxaPay payment invoice link                          │
│ 7. Day 29 (1 day to expiry) → Second automated email        │
│ 8. Day 30 (Expiry) → status = 'expired', gates access       │
│ 9. Day 37 (7 days past due) → status = 'cancelled'          │
└─────────────────────────────────────────────────────────────┘
```

### Manual Renewal Protocol:
1. **Plan Selection**: The founder selects a plan on the billing dashboard.
2. **Invoice Generation**: The Next.js BFF calls the OxaPay API to generate a payment request with `order_id` format: `karnex_{tier}_{founder_id}_{timestamp}`.
3. **Redirection**: The founder is redirected to the OxaPay hosted payment page to pay.
4. **Payment Webhook**: When payment is detected, OxaPay sends a webhook callback to `/api/webhooks/oxapay`.
5. **Activation**: The webhook handler validates the signature, matches the `order_id` payload to the founder, sets `status = 'active'`, `started_at = now()`, and `expires_at = now() + INTERVAL '30 days'`.
6. **5-Day Reminder**: 5 days before `expires_at`, an edge function triggers a Resend email with a fresh OxaPay payment link to extend the subscription by 30 days.
7. **1-Day Reminder**: 1 day before `expires_at`, a final warning email is sent with the payment link.
8. **Expiration Gate**: If `now() > expires_at`, the system updates `status = 'expired'`, locks access to all gated features, and redirects the dashboard view to a renewal prompt.
9. **Renewal Webhook**: If a renewal payment is confirmed via webhook, the handler appends 30 days to `expires_at` (if currently active/expiring_soon) or sets it to `now() + 30 days` (if already expired) and resets the status to `active`.

---

## OxaPay API Integration Points

### 1. Create Invoice (`POST https://api.oxapay.com/v1/payment/invoice`)
In Next.js backend, used to initiate a payment request:
- **Request Headers**:
  ```
  merchant_api_key: OXAPAY_MERCHANT_API_KEY
  ```
- **Request Body**:
  ```json
  {
    "amount": 79.00,
    "currency": "USD",
    "payCurrency": "USDT",
    "lifeTime": 60,
    "callbackUrl": "https://karnex.com/api/webhooks/oxapay",
    "returnUrl": "https://karnex.com/billing?status=pending",
    "orderId": "karnex_builder_d83e1a0b-fa5c-4d39_1716900000",
    "description": "Karnex Builder Plan - 1 Month Subscription"
  }
  ```
- **Response**:
  ```json
  {
    "result": 1,
    "message": "success",
    "trackId": 9876543,
    "paymentUrl": "https://oxapay.com/pay/9876543"
  }
  ```

### 2. Check Payment Status (`GET https://api.oxapay.com/v1/payment/{track_id}`)
Polled in the background if a webhook is delayed:
- **Request Headers**:
  ```
  merchant_api_key: OXAPAY_MERCHANT_API_KEY
  ```
- **Response**:
  ```json
  {
    "result": 1,
    "status": "Paid",
    "amount": 79.00,
    "currency": "USD",
    "payCurrency": "USDT",
    "payAmount": 79.00,
    "txID": "0xBlockchainTxHash...",
    "orderId": "karnex_builder_d83e1a0b-fa5c-4d39_1716900000"
  }
  ```

### 3. Webhook Receiver (`/api/webhooks/oxapay`)
OxaPay makes a POST call to this endpoint on transaction updates:
- `payment.confirming`: Transaction broadcasted to blockchain network.
- `payment.paid`: Transaction confirmed on-chain (status → `confirmed`).
- `payment.expired`: Invoice expired without payment (status → `expired`).

---

## Subscription State Machine

We manage the following states in our Supabase `subscriptions` table:

```
                  ┌──────────────┐
                  │   trialing   │ (14 days, no card)
                  └──────┬───────┘
                         │ trial ends / credit limit hit
                         ▼
                  ┌──────────────┐
  ┌──────────────▶│pending_paymt │ ◄──────────────────────┐
  │               └──────┬───────┘                        │
  │                      │ OxaPay webhook: payment.paid   │
  │                      ▼                                │
  │               ┌──────────────┐                        │
  │  ┌───────────▶│    active    │                        │
  │  │            └──────┬───────┘                        │
  │  │                   │ Day 25 (5 days to expiry)      │
  │  │                   ▼                                │
  │  │            ┌──────────────┐                        │
  │  │            │expiring_soon │                        │
  │  │            └──────┬───────┘                        │
  │  │                   │ Day 30 (expires_at)            │
  │  │                   ▼                                │
  │  │            ┌──────────────┐                        │
  │  │            │   expired    │ ───────────────────────┤
  │  │            └──────┬───────┘                        │
  │  │                   │ Day 37 (7 days past due)       │
  │  │                   ▼                                │
  │  │            ┌──────────────┐                        │
  │  │            │  cancelled   │ ───────────────────────┘
  │  └────────────┴──────────────┘
  │     OxaPay webhook: payment.paid (re-activates)
  └───────────────────────────────────────────────────────┘
```

- **`trialing`**: Free trial. 14 days, 20 tasks, no payment details required.
- **`pending_payment`**: Triggered when a user initiates upgrade/renewal checkout. Resolves to `active` on payment, or falls back to previous state on timeout.
- **`active`**: Invoice paid. Full access to tier-specific features.
- **`expiring_soon`**: 5 days before `expires_at`. Renewal link generated and emailed. Access remains open.
- **`expired`**: `now() > expires_at`. Gated dashboard view. No agent executions allowed.
- **`cancelled`**: 7 days past `expires_at` without renewal payment. All metadata and project pipelines are preserved for 90 days before soft-deletion.

---

## Agent Task Credit System

### How Credits Work

1. **One agent run = one credit.** Regardless of complexity or duration.
2. **Credits are allocated per billing cycle.** Reset at the start of each billing period (every 30 days).
3. **Credits do not roll over.** Unused credits expire at period end.
4. **Failed runs do not consume credits.** Automatically refunded if status = `error`.
5. **Chain runs consume 1 credit per agent in the chain.**
6. **Manual renewal updates credit counts.** When the webhook extends the `expires_at` date, the `credits_used` is reset to `0` and `credits_total` is set according to the active tier.

| Agent | Credits per Run | Rationale |
|-------|----------------|-----------|
| All agents | 1 | MVP simplicity — flat rate per run. |

---

## Metering Architecture

### How Usage Is Tracked

Since we do not rely on an external payment processor's metering (like **Stripe [v2 - deferred]** usage records), Supabase acts as the single source of truth for task limits and usage.

```
┌──────────────────────────────────────────────────────┐
│                  Credit Flow                          │
│                                                      │
│  1. Founder triggers agent                           │
│     │                                                │
│  2. Next.js API route checks credits                 │
│     │                                                │
│     ├── credits_remaining > 0?                       │
│     │   ├── YES → Deduct credit (atomic SQL)         │
│     │   │         → Forward to agent service         │
│     │   │                                            │
│     │   └── NO  → Return 402 (Payment Required)      │
│     │             → Show renewal/upgrade modal       │
│     │                                                │
│  3. Agent executes                                   │
│     │                                                │
│     ├── SUCCESS → Credit stays deducted              │
│     └── ERROR   → Refund credit (increment +1)       │
│                                                      │
│  4. Billing cycle resets                             │
│     └── OxaPay Webhook (on renewal payment)          │
│         → Extend expires_at + 30 days                │
│         → Reset credits_used to 0                    │
└──────────────────────────────────────────────────────┘
```

### Atomic Credit Deduction

```sql
# [v2 - deferred] Stripe - not in v1
-- Ensures no double-deduction under concurrent requests
CREATE OR REPLACE FUNCTION deduct_agent_credit(p_founder_id UUID)
RETURNS TABLE(credits_remaining INTEGER, tier subscription_tier) AS $$
BEGIN
  RETURN QUERY
  UPDATE subscriptions
  SET credits_used = credits_used + 1,
      updated_at = NOW()
  WHERE founder_id = p_founder_id
    AND status = 'active'
    AND (credits_total = -1 OR credits_used < credits_total)  -- -1 = unlimited
  RETURNING 
    CASE WHEN credits_total = -1 THEN 999999 ELSE credits_total - credits_used - 1 END,
    subscriptions.tier;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CREDITS_EXHAUSTED_OR_INACTIVE';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Upgrade / Downgrade Logic

### Upgrade Flow
1. Founder clicks "Upgrade" on Billing page.
2. Selects higher plan (e.g. Starter → Builder).
3. Backend calls OxaPay to generate an invoice.
4. Founder pays invoice. Webhook triggers backend to immediately:
   - Adjust `tier` to the new selection.
   - Set `credits_total` to new plan maximum.
   - Adjust `expires_at = now() + 30 days` (unused time on previous plan is calculated as credit toward the new stablecoin charge amount, or simply sets a fresh 30-day window).

### Downgrade Flow
1. Founder selects lower tier in settings.
2. Status remains `active` on current plan until `expires_at`.
3. 5 days before expiry, the reminder email sends an invoice with the lower tier's USD-equivalent price.
4. If payment is completed, the webhook activates the lower tier with its corresponding credit limits.

---

## v2 Stripe [v2 - deferred] Migration Path

Stripe [v2 - deferred] is explicitly deferred to **[v2 - deferred]** as an alternative billing option. To ensure Stripe [v2 - deferred] can be added as a drop-in integration in v2 without database refactoring:
- The `subscriptions` table is generic and payment-processor-agnostic.
- The `payments` table tracks transactions at the database level rather than inside a payment processor.
- When Stripe [v2 - deferred] is added, a Stripe [v2 - deferred] Webhook handler (`/api/webhooks/stripe [v2 - deferred]` **[v2 - deferred]**) will interact with the same database state machine, simply bypassing the manual renewal email triggers and relying on Stripe [v2 - deferred]'s native recurring billing.

---

## Revenue Metrics to Track

Since subscription state is self-hosted in Supabase, we track financial metrics using direct database queries rather than payment processor dashboards.

| Metric | Definition | Target (Month 6) | Tracking Query |
|---|---|---|---|
| **MRR** | Monthly Recurring Revenue | $5,000 | Sum of `plan price` for active/expiring_soon subscriptions |
| **New MRR** | MRR from new signups this month | $1,500 | Sum of payments where subscription had `trialing` as previous status |
| **Expansion MRR** | MRR from plan upgrades | $500 | Sum of payments where user upgraded to a higher tier |
| **Churn Rate** | Expirations and cancellations | < 5% | Subscriptions moving to `cancelled` status / total active |

### Metrics Tracking Queries (Supabase SQL)
```sql
-- Monthly Recurring Revenue (MRR) Calculation
SELECT SUM(
  CASE 
    WHEN tier = 'starter' THEN 29.00
    WHEN tier = 'builder' THEN 79.00
    WHEN tier = 'founder' THEN 149.00
    WHEN tier = 'studio' THEN 299.00
    ELSE 0.00
  END
) as mrr
FROM subscriptions
WHERE status IN ('active', 'expiring_soon');

-- Churn Rate Calculation (Last 30 Days)
SELECT 
  (SELECT COUNT(*)::numeric FROM subscriptions WHERE status = 'cancelled' AND updated_at > NOW() - INTERVAL '30 days') /
  NULLIF((SELECT COUNT(*)::numeric FROM subscriptions WHERE status IN ('active', 'expiring_soon')), 0) * 100 as monthly_churn;
```

---

*Last updated: 2026-05-28 | Version: 1.1.0*
*OxaPay API endpoints and HMAC structures are outlined for v1. Stripe [v2 - deferred] references marked [v2 - deferred].*
