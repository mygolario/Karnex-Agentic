# Karnex — Integration Specifications

> **Every third-party integration documented.** Auth methods, endpoints, data mapping, rate limits, and failure handling.

---

## Integration Overview

| # | Service | Purpose | Auth Method | MVP? | Status |
|---|---------|---------|-------------|------|--------|
| 1 | Supabase | Database, Auth, Storage, Realtime | Service Role Key / Anon Key | ✅ | Core |
| 2 | OxaPay | Payments & Billing (Crypto) | API Key + Webhooks | ✅ | Active |
| 2.1 | Stripe [v2 - deferred] | Payments & Billing (Credit Cards) | API Key + Webhooks [v2 - deferred] | ❌ | Stripe [v2 - deferred] |
| 3 | Google Gemini | LLM Inference | API Key | ✅ | Core |
| 4 | GitHub | Code Repository | OAuth App | ✅ | Phase 2 |
| 5 | Gmail API | Outreach Email | OAuth 2.0 | ✅ | Phase 2 |
| 6 | Resend | Transactional Email | API Key | ✅ | Phase 1 |
| 7 | PostHog | Product Analytics | API Key | ✅ | Phase 3 |
| 8 | Vercel | Frontend Deployment | Git Integration | ✅ | Core |
| 9 | Railway | Backend Deployment | Git Integration | ✅ | Core |
| 10 | LinkedIn API | Outreach Messages | OAuth 2.0 | ❌ | v2 |
| 11 | Notion API | Project Sync | OAuth 2.0 | ❌ | v2 |
| 12 | Airtable API | Data Import/Export | OAuth 2.0 | ❌ | v2 |
| 13 | Cal.com | Meeting Scheduling | API Key | ❌ | v2 |
| 14 | Google Analytics 4 | Web Analytics | API Key | ❌ | v2 |
| 15 | Intercom/Crisp | Customer Support Chat | API Key | ❌ | v2 |

---

## 1. Supabase

Refer to [techstack.md](file:///c:/Karnex-Agentic/.karnex/techstack.md) and [datamodels.md](file:///c:/Karnex-Agentic/.karnex/datamodels.md) for core configuration. Full RLS policies restrict all browser access, and the FastAPI Agent Service utilizes the service role key to write outputs.

---

## 2. OxaPay

| Field | Details |
|---|---|
| **Purpose** | Primary payment gateway (v1) for cryptocurrency billing. Handles invoicing, payment checking, and webhook notifications. |
| **Auth Method** | API Key (`OXAPAY_MERCHANT_API_KEY`) sent in HTTP Header `merchant_api_key`. Webhook signatures validated using HMAC-SHA512 using `OXAPAY_MERCHANT_API_KEY` as the secret key. |
| **Base URL** | `https://api.oxapay.com` |
| **Environment Variables** | `OXAPAY_MERCHANT_API_KEY`, `NEXT_PUBLIC_OXAPAY_CALLBACK_URL`, `NEXT_PUBLIC_OXAPAY_SANDBOX` |

### Key API Endpoints:

| Endpoint | Method | Payload / Headers | Purpose |
|---|---|---|---|
| `/v1/payment/invoice` | POST | Header: `merchant_api_key` <br> Body: `{ amount, currency, payCurrency, lifeTime, callbackUrl, returnUrl, orderId, description }` | Create a cryptocurrency payment request (invoice). Returns a `trackId` and `paymentUrl`. |
| `/v1/payment/{track_id}` | GET | Header: `merchant_api_key` | Query the details and status of a specific payment session. |
| `/api/webhooks/oxapay` | POST (Webhook) | Header: `HMAC` (HMAC-SHA512 signature) <br> Body: JSON payload including `track_id`, `status` ("Paying" or "Paid"), `type` ("invoice"), `amount`, `currency`, `order_id`, `date`, `txs` array. | Receives updates when transaction statuses change. |

### Webhook Security & Signature Verification:
1. When OxaPay invokes our webhook, it includes the computed signature in the `HMAC` header.
2. The signature is an HMAC-SHA512 hash computed over the raw POST body string, using the `OXAPAY_MERCHANT_API_KEY` as the shared secret key.
3. In our Next.js API route, we compute the HMAC-SHA512 of the raw body text and compare it directly to the `HMAC` header value.
4. If they match, process the status update. Immediately respond with HTTP 200 containing exactly the body `ok` to confirm receipt.
5. If they do not match, reject with HTTP 400.

### Webhook Flow & Statuses:
- **Paying**: Payer transferred funds, awaiting blockchain confirmation. Log the transition but **do not** activate the subscription.
- **Paid**: Fully confirmed on-chain. Update the database and **activate/renew** the subscription.
- **Required Response**: HTTP 200 with the exact string body `ok` (no JSON, no quotes).
- **Retry Policy**: Up to 5 retries on non-200 responses: immediate, 1min, 3min, 30min, 3hrs.

### Local Development Note:
OxaPay cannot reach localhost. Use ngrok during development. Expose your local server (e.g. port 3000) and configure `NEXT_PUBLIC_OXAPAY_CALLBACK_URL=https://your-ngrok-url.ngrok.io/api/webhooks/oxapay` in `.env.local`.

### Data Mapping:

| Karnex Database Field | OxaPay Webhook Payload Field |
|---|---|
| `payments.oxapay_track_id` | `track_id` (Internal transaction reference) |
| `payments.oxapay_order_id` | `order_id` (Form: `karnex_{plan}_{founder_id}_{timestamp}`) |
| `payments.amount_usd` | `amount` (Requested payment in USD) |
| `payments.currency` | `currency` (Stablecoin currency paid: 'USDT' or 'USDC') |
| `payments.amount_crypto` | `payAmount` (within `txs` array or main payload `payAmount`) |
| `payments.status` | Mapping: `Paying` → `confirming`, `Paid` → `confirmed` |

### Failure Handling & Polling:
- **Webhook Loss Prevention**: Since webhooks can fail to deliver, Karnex implements a polling fallback service.
- **Trigger**: When an invoice is created, if the webhook is not received in state `Paid` within 30 minutes, the polling engine activates.
- **Execution**: The server queries the inquiry endpoint `GET /v1/payment/{track_id}` every 5 minutes for up to 2 hours. If a payment is found, the subscription is updated and polling stops. If 2 hours elapse with no payment or if the API returns `Expired` / `Failed`, the invoice is updated to `expired` in the database, and polling terminates.

---

## 2.1 Stripe [v2 - deferred]

Stripe [v2 - deferred] is deferred to **[v2 - deferred]** as a secondary payment method alongside OxaPay. The Supabase database subscription and payment schemas are payment-processor-agnostic to support Stripe [v2 - deferred] as a drop-in integration in a future release.

| Field | Details [v2 - deferred] |
|---|---|
| **Purpose [v2 - deferred]** | Credit card payment gateway. Bypasses the renewal reminder pipeline. |
| **Auth Method [v2 - deferred]** | API Key (secret key) + Webhook signing secret. |
| **Key Endpoints [v2 - deferred]** | `POST /v1/customers`, `POST /v1/checkout/sessions`, `POST /v1/billing_portal/sessions`. |
| **Webhook Events [v2 - deferred]** | `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`. |

---

## 3. Google Gemini API

Generative models are configured and queried in the agent execution loops. See [promptlibrary.md](file:///c:/Karnex-Agentic/.karnex/promptlibrary.md) for details.

---

## 4. GitHub

Used by Builder Agent (`builder-v1`) to manage code commits and pull requests.
- **Auth**: OAuth App (user-level token).
- **Rate Limits**: 5,000 requests/hour per user.
- **Batching**: Utilizes Git Trees API to perform multiple file updates in a single commit, preventing API rate-limiting blocks.

---

## 5. Gmail API

Used by Outreach Agent (`outreach-v1`) to dispatch cold mailings from the founder's address.
- **Auth**: Google Cloud OAuth 2.0.
- **Scope**: `gmail.send` only (cannot read emails).
- **Self-Imposed Rate Limit**: Maximum 50 emails/day per user.

---

## 6. Resend

Transactional notification gateway. Billed on API key access.
- **Purpose**: System welcome, daily standup check-in notifications, and manual subscription renewal invoice emails (sent 5 days and 1 day before subscription expiration).

---

## 7. PostHog

Product tracking and feature flags. Integrates client-side and backend events (e.g. signup, subscription changes, agent completions).

---

## 8. Vercel

Edge network host. Connected via GitHub webhook. Deploys frontend on main pushes, and exposes preview links on feature pull requests.

---

## 9. Railway

Docker container runtime environment. Deploy target for Python FastAPI services.

---

## 10–15. Deferred Integrations (v2)

Refer to [integrations.md](file:///c:/Karnex-Agentic/.karnex/integrations.md) for detail on Notion, Airtable, Cal.com, GA4, and Intercom integrations.

---

*Last updated: 2026-05-28 | Version: 1.1.0*
*Stripe [v2 - deferred] specs marked [v2 - deferred]. OxaPay integration specification active for v1 launch.*
