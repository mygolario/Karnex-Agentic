export type TokenHealth = 'valid' | 'expiring' | 'expired' | 'na'

export function getTokenHealth(
  tokenExpiresAt: string | null | undefined,
  hasOAuthTokens: boolean
): TokenHealth {
  if (!hasOAuthTokens) return 'na'
  if (!tokenExpiresAt) return 'valid'
  const expires = new Date(tokenExpiresAt).getTime()
  const now = Date.now()
  if (expires <= now) return 'expired'
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  if (expires - now < sevenDays) return 'expiring'
  return 'valid'
}

export function tokenHealthLabel(health: TokenHealth): string {
  switch (health) {
    case 'valid':
      return 'Valid'
    case 'expiring':
      return 'Expiring soon'
    case 'expired':
      return 'Expired'
    case 'na':
      return 'N/A'
  }
}
