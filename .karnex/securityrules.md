# Karnex — Security Architecture & Rules

> **Security architecture, auth, data protection, agent safety, and compliance.**

---

## 1. Auth Security

### Session & Token Management

| Setting | Value | Rationale |
|---|---|---|
| Access token (JWT) lifetime | 1 hour | Short-lived to limit exposure window |
| Refresh token lifetime | 7 days | Balances security with UX (weekly re-auth at most) |
| Refresh token rotation | Enabled | Each refresh invalidates the previous token — limits token replay attacks |
| Token storage | httpOnly, Secure, SameSite=Lax cookie | Prevents XSS access to tokens; CSRF protection via SameSite |
| Session invalidation on password change | Yes | All existing sessions terminated when password is changed |
| Max concurrent sessions | 5 per user | Prevents credential sharing while allowing multi-device use |

### Password Requirements

| Rule | Value |
|---|---|
| Minimum length | 8 characters |
| Complexity | At least 1 uppercase, 1 lowercase, 1 number |
| Breached password check | Validate against HaveIBeenPwned API (via Supabase or custom) |
| Lockout | 5 failed attempts → 15-minute lockout |
| Reset flow | Email-based OTP via Supabase Auth |

### OAuth Security (Google)

- State parameter validated on callback (CSRF protection)
- PKCE (Proof Key for Code Exchange) enabled for all OAuth flows
- Redirect URIs whitelisted in Google Cloud Console (no wildcard)
- OAuth tokens (for Google login) not stored — only Supabase session matters

---

## 2. API Security

### Rate Limiting Strategy

| Endpoint Category | Rate Limit | Window | Identifier |
|---|---|---|---|
| Auth endpoints (login/signup) | 10 requests | Per minute | IP address |
| Agent trigger endpoints | 30 requests | Per minute | Founder ID |
| General API endpoints | 100 requests | Per minute | Founder ID |
| Webhook endpoints | 200 requests | Per minute | Source IP (OxaPay / GitHub) |
| Public endpoints (landing page) | 60 requests | Per minute | IP address |

**Implementation:**

```typescript
// Next.js API rate limiting with Upstash Redis (or in-memory for MVP)
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  analytics: true,
});

// In API route:
const { success, limit, remaining } = await ratelimit.limit(founderId);
if (!success) {
  return NextResponse.json(
    { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests" } },
    { status: 429, headers: { "Retry-After": "60" } }
  );
}
```

### Input Validation

| Layer | Tool | Scope |
|---|---|---|
| Frontend | Zod schemas | Form validation before submission |
| Next.js API routes | Zod schemas | Request body, query params, path params |
| FastAPI agent service | Pydantic models | All request bodies and path params |
| Database | PostgreSQL constraints | CHECK constraints, NOT NULL, foreign keys |

**Rules:**
- All user input is validated at the API layer before processing.
- String inputs have maximum length constraints.
- JSON payloads have maximum depth and size limits (1 MB default).
- SQL injection prevention via parameterized queries (Supabase client handles this).
- XSS prevention via React's default escaping + Content-Security-Policy headers.

### Auth Middleware

```typescript
// apps/web/middleware.ts
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  // Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession();
  
  // Protected routes
  if (!session && req.nextUrl.pathname.startsWith("/(dashboard)")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  
  // API routes require auth
  if (!session && req.nextUrl.pathname.startsWith("/api/") 
      && !req.nextUrl.pathname.startsWith("/api/webhooks")
      && !req.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED" } },
      { status: 401 }
    );
  }
  
  return res;
}
```

### Content Security Policy

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://app.posthog.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https://*.supabase.co;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.supabase.co https://app.posthog.com wss://*.supabase.co;
  object-src 'none';
  base-uri 'self';
```

---

## 3. Data Security

### Encryption

| Data State | Encryption | Method |
|---|---|---|
| **In transit** | ✅ Enforced | TLS 1.3 on all connections (Supabase, Vercel, Railway enforce HTTPS) |
| **At rest (database)** | ✅ Enforced | Supabase encrypts all data at rest with AES-256 (managed by Supabase) |
| **At rest (file storage)** | ✅ Enforced | Supabase Storage uses AES-256 server-side encryption |
| **Integration tokens** | ✅ Application-level | OAuth tokens encrypted using `pgcrypto` before storage |
| **Founder Vault documents** | ✅ Application-level | Encrypted with per-founder key derived from master key |

### Token Encryption Example

```sql
-- Encrypt before storing
INSERT INTO integrations (founder_id, provider, access_token_encrypted)
VALUES (
  $1, 'github',
  pgp_sym_encrypt($2, current_setting('app.encryption_key'))
);

-- Decrypt when reading
SELECT pgp_sym_decrypt(
  access_token_encrypted::bytea,
  current_setting('app.encryption_key')
) AS access_token
FROM integrations
WHERE founder_id = $1 AND provider = 'github';
```

---

## 4. Agent Safety Rules

### What Agents CAN Do Without Confirmation
- Read from Karnex Memory (founder's own data).
- Write to Karnex Memory (within their namespace).
- Query Supabase (RLS-scoped to founder).
- Call Google Gemini API (LLM inference).
- Perform web searches (read-only).
- Generate content, code, plans (internal drafts).
- Update task statuses and sprint progress.
- Calculate metrics and scores.

### What Agents CANNOT Do Without Explicit Founder Confirmation

| Action | Confirmation Type | Rationale |
|---|---|---|
| Send email via Gmail API | Per-campaign approval | Emails are irrevocable and represent the founder |
| Send LinkedIn messages | Per-campaign approval | Same — external communication |
| Push code to GitHub | Per-push approval (or per-PR) | Code changes affect the founder's product |
| Deploy to production (Vercel/Railway) | Explicit "Deploy" confirmation | Production deployments affect live users |
| Create OxaPay invoice | Automatic request | Initiates checkout flow, no manual payment pull |
| Delete any data | Confirmation with 30-second undo | Data loss prevention |
| Share data with new integration | OAuth consent flow | Privacy — founder controls data sharing |

---

## 5. Third-Party Integration Security

### API Key Storage

| Secret Type | Storage | Access |
|---|---|---|
| Karnex-owned API keys (Gemini, OxaPay, Resend) | Environment variables (Vercel/Railway) | Server-side only, injected at runtime |
| Founder's OAuth tokens (Gmail, GitHub) | `integrations` table, encrypted columns | Decrypted only when making API calls, never exposed to client |
| Internal service-to-service key | Environment variable | Validated on every request from Next.js to FastAPI |

### Key Rotation Schedule

| Secret | Rotation Frequency | Process |
|---|---|---|
| OxaPay API keys | Quarterly | Generate new key in OxaPay → update env vars → verify → revoke old key |
| Stripe [v2 - deferred] [v2] keys | Quarterly | Generate new key in Stripe [v2 - deferred] → update env vars [v2 - deferred] |
| Gemini API key | Quarterly | Same process via Google Cloud Console |
| Resend API key | Quarterly | Same process |
| Internal service key | Monthly | Generate new UUID → deploy to both services → verify → remove old |
| Founder OAuth tokens | Auto (refresh token rotation) | Handled by OAuth refresh flow |

---

## 5.1 Crypto Payment Security

To secure the transaction auditing, ledger entries, and billing status of Karnex, the OxaPay payments integration adheres to these strict rules:

1. **Mandatory Signature Verification**: Under no circumstances should a payment webhook payload be processed without successful cryptographic verification. The receiver must validate the request `HMAC` header using **HMAC-SHA512** signature verification over the raw string body of the POST request. The computed signature must be compared directly to the `HMAC` header value. The shared key is `OXAPAY_MERCHANT_API_KEY`.
2. **Key Storage Rules**: All OxaPay merchant API keys, webhook secrets, and access tokens must reside in environment variables only. They are never hardcoded in source code, stored in static configuration files, or committed to Git. Logger modules must scrub these keys from error traces and standard outputs.
3. **Audit Trail Logging**: Webhook payloads are logged in the `raw_webhook_payload` column of the `payments` table. Before saving, any PII (such as buyer emails, blockchain transaction addresses of individuals) must be verified to ensure compliance.
4. **Idempotency Enforcement**: The webhook handler must be strictly idempotent. When a payload is processed, the system logs the `oxapay_track_id` in the `payments` table. If the same `oxapay_track_id` is received in a subsequent request, the server must bypass database writes, skip status modification loops, and return HTTP 200 `ok` to indicate success.
5. **Replay Attack Prevention**: Webhook payloads must contain a timestamp. The webhook handler verifies the timestamp against the server's current time and rejects payloads older than 10 minutes (600 seconds) to prevent replay attacks.
6. **Service Role Authorization**: Changing a user's subscription state in the database is strictly prohibited from client side or standard authenticated API keys. Updates are restricted to a secure webhook route. The webhook controller performs write operations using the Supabase Service Role key (which bypasses database RLS policies), locking database write capability away from the client.
7. **Two-phase Webhook Processing**: Never activate a subscription on "Paying" status. Only activate on confirmed "Paid" status. The "Paying" status means funds are in transit — not yet settled. Acting on "Paying" would grant access before money is received.

---

## 6. Supabase RLS Policy Philosophy

### Principles
1. **Default deny.** RLS is enabled on every table. If no policy matches, the query returns nothing.
2. **Founder isolation.** Every table with founder data has `founder_id = auth.uid()` in its policies.
3. **No cross-tenant access.** Even if a bug exists in application code, RLS prevents data leakage at the database level.
4. **Service role for webhooks and agents.** The service_role key (which bypasses RLS) is used exclusively by the agent service and webhook callback controllers. Never in client-side code.
5. **Audit trail.** The `agent_runs` table serves as a complete audit trail of all agent actions.

---

## 7. GDPR Compliance Approach

Refer to [securityrules.md](file:///c:/Karnex-Agentic/.karnex/securityrules.md) for standard procedures. If a founder requests account deletion:
- All database rows in `founders`, `startups`, `ideas`, `roadmaps`, `sprints`, `tasks`, `agent_runs`, `agent_outputs`, `integrations`, `subscriptions`, `payments`, and `renewal_reminders` are hard deleted.
- All active OxaPay payment requests for this user are ignored/de-linked, and all OAuth credentials are revoked.

---

## 8. Secret Scanning & Environment Variable Rules

Enforced in pre-commit hooks and Github Actions. Secrets matching keys (e.g. Gemini, OxaPay, Stripe [v2 - deferred] **[v2 - deferred]**) are automatically blocked if committed.

---

## 9. Incident Response Protocol

Standard escalation channels (P0 to P3) remain in force. A security breach of the OxaPay integration or webhook receiver endpoint constitutes a **P0 - Critical** severity incident. Containment steps:
- Block incoming webhooks at the server level.
- Revoke and rotate `OXAPAY_MERCHANT_API_KEY`.
- Halt processing of manual subscription activations.
- Notify affected users within 72 hours.

---

*Last updated: 2026-05-28 | Version: 1.1.0*
*OxaPay crypto billing security specifications active for v1. Stripe [v2 - deferred] references marked [v2 - deferred]. HMAC-SHA512 verification enforced.*
