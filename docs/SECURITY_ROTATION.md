# Security rotation checklist

If real API keys or private keys were ever committed in `.env.example` (or pushed to GitHub), rotate them **before** the scrubbed template is committed.

## Rotate in each provider dashboard

| Service | Action |
|---------|--------|
| **GitHub App** | Karnex-Agentic → Private keys → Generate new key → delete old → update `GITHUB_PRIVATE_KEY` in `.env` and Railway if used |
| **Resend** | [resend.com/api-keys](https://resend.com/api-keys) → revoke exposed key → create new → update `RESEND_API_KEY` |
| **Google Cloud** | OAuth client → reset client secret → update `GMAIL_CLIENT_SECRET` |
| **PostHog** | Revoke personal API key (`phx_…`) → create new → update `POSTHOG_API_KEY`; project token (`phc_…`) can be rolled in project settings if needed |
| **LangSmith** | Account → API keys → revoke `lsv2_pt_…` → create new → update `LANGCHAIN_API_KEY` |
| **OpenRouter** | [openrouter.ai/keys](https://openrouter.ai/keys) → revoke exposed key → create new → update `OPENROUTER_API_KEY` on Railway and `.env` |
| **OxaPay** | Merchant dashboard → rotate merchant API key → update Vercel + `.env` |
| **Supabase** | Only if service role was exposed publicly → Project Settings → API → roll service role (rare; anon key is public by design) |

## After rotation

1. Update root [`.env`](../.env) only (never `.env.example`).
2. Update **Vercel** and **Railway** environment variables to match.
3. Redeploy Vercel production and Railway agent service.
4. Do not paste new secrets in chat or tickets.

## Prevent recurrence

- [`.env.example`](../.env.example) must contain placeholders only.
- [`.env`](../.env) stays in [`.gitignore`](../.gitignore).
- Run `git diff .env.example` before commit to confirm no `sk-`, `re_`, `phc_`, `phx_`, `lsv2_`, or `BEGIN RSA` lines.
