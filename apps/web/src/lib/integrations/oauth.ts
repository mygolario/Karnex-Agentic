import { randomBytes } from 'crypto'
import type { IntegrationProviderId } from './providers'

export const OAUTH_STATE_COOKIE_PREFIX = 'karnex_oauth_state_'

export function generateOAuthState(): string {
  return randomBytes(32).toString('hex')
}

export function oauthStateCookieName(provider: IntegrationProviderId): string {
  return `${OAUTH_STATE_COOKIE_PREFIX}${provider}`
}

export function oauthCallbackPath(provider: IntegrationProviderId): string {
  return `/api/integrations/${provider}/callback`
}

export function isSupportedOAuthProvider(
  provider: string
): provider is IntegrationProviderId {
  return provider === 'github' || provider === 'gmail'
}
