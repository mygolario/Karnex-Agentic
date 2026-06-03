# Deploy environment variables

Single source of truth for local dev: **repo root** [`.env`](../.env) (from [`.env.example`](../.env.example)).

Run once after clone:

```powershell
.\scripts\setup-env.ps1
```

## Platform matrix

| Variable | Vercel (`apps/web`) | Railway (`services/`) |
|----------|---------------------|------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server routes only) | Yes |
| `SUPABASE_URL` | — | Yes (or auto from `NEXT_PUBLIC_*` in root `.env`) |
| `OPENROUTER_API_KEY` | Yes (onboarding + agent proxy routes) | Yes |
| `RESEND_API_KEY` | Yes (transactional email, automations) | Optional |
| `KARNEX_INTERNAL_WEBHOOK_SECRET` | Yes (task complete + automation triggers) | Yes (cron automations) |
| `KARNEX_APP_URL` | Optional fallback for internal webhooks | — |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Yes (GitHub OAuth) | — |
| `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` | Yes (Gmail OAuth) | — |
| `ENCRYPTION_KEY` | Yes (32-char token encryption) | — |
| `GOOGLE_GEMINI_API_KEY` | — | Yes |
| `OXAPAY_MERCHANT_API_KEY` | Yes | Optional |
| `NEXT_PUBLIC_OXAPAY_CALLBACK_URL` | Yes | — |
| `NEXT_PUBLIC_OXAPAY_SANDBOX` | Yes | — |
| `AGENT_SERVICE_URL` | Yes (Production) | — |
| `NEXT_PUBLIC_APP_URL` | Yes | — |
| `ENVIRONMENT` | — | `production` |
| `CORS_ORIGINS` | — | `https://arioai.site,https://www.arioai.site` |
| `KARNEX_WEB_ORIGIN` | — | Same as Vercel URL |
| `AGENT_SERVICE_INTERNAL_KEY` | — | Random secret (match if BFF sends header) |
| `SUPABASE_JWT_SECRET` | — | Legacy JWT secret (HS256 tokens only) |
| `SUPABASE_JWKS_URL` | — | Optional override; default `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` for ES256 user tokens |

## Live URLs (reference)

| Service | URL |
|---------|-----|
| Frontend | https://arioai.site (alias: https://www.arioai.site) |
| Agent API | https://web-production-7ea9c.up.railway.app |
| OxaPay webhook | `https://arioai.site/api/webhooks/oxapay` |
| Supabase project | `vwvolsmukrfwrnbmxatc` |
| Karnex version | **2.0.0** (deployed 2026-06-03) |
| OxaPay mode (production) | Sandbox (`NEXT_PUBLIC_OXAPAY_SANDBOX=true`) |

## Vercel CLI (non-secret values)

From `apps/web` after `npx vercel link`:

```powershell
cd apps\web
$app = "https://arioai.site"
"https://web-production-7ea9c.up.railway.app" | npx vercel env add AGENT_SERVICE_URL production
"$app" | npx vercel env add NEXT_PUBLIC_APP_URL production
"$app/api/webhooks/oxapay" | npx vercel env add NEXT_PUBLIC_OXAPAY_CALLBACK_URL production
"true" | npx vercel env add NEXT_PUBLIC_OXAPAY_SANDBOX production
```

Redeploy after changing env vars.

## Railway

Set the Python column in the matrix on the service that builds `services/Dockerfile`. Health check: `GET /v1/health` (also `/health` for legacy probes).

## Local vs production

| Setting | Local (`.env`) | Production (Vercel / Railway) |
|---------|----------------|----------------------------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://arioai.site` |
| `AGENT_SERVICE_URL` | `http://localhost:8000` or remote Railway URL | `https://web-production-7ea9c.up.railway.app` |
| `NEXT_PUBLIC_OXAPAY_CALLBACK_URL` | `http://localhost:3000/...` or ngrok | `https://arioai.site/api/webhooks/oxapay` |
| `ENVIRONMENT` | `development` | `production` (Railway) |
| `CORS_ORIGINS` / `KARNEX_WEB_ORIGIN` | `localhost:3000` | Vercel app URL |
| Secrets | Root `.env` only | Platform dashboards only |

Use remote Railway in local `.env` if you are not running `uvicorn` locally. Prefer `/api/agent` on Next.js over `NEXT_PUBLIC_AGENT_SERVICE_URL`.

## Never commit

`.env`, `.env.local`, and platform-pulled files are gitignored. [`.env.example`](../.env.example) must use placeholders only — see [SECURITY_ROTATION.md](SECURITY_ROTATION.md) if secrets were ever committed.
