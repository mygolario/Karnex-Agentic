## Changelog

### [2025] Payment System — v1 Decision
- Replaced Stripe [v2 - deferred] with OxaPay as primary payment processor for v1 launch
- Stablecoin-only (USDT/USDC) to eliminate volatility risk
- Subscription management self-hosted in Supabase via webhook-driven flow
- Renewal reminders via Resend email (5-day and 1-day before expiry)
- Stripe [v2 - deferred] deferred to v2 as secondary/alternative payment option
- Rationale: global reach, crypto-native founder audience, faster launch, no Stripe [v2 - deferred] geo-restrictions
