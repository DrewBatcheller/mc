/**
 * Token refresh utilities for handling authentication
 * Used in API routes to ensure token is valid before executing mutations
 */

/**
 * Calculate if token expires soon (within 5 minutes)
 */
export function isTokenExpiringSoon(tokenIssuedAt: number, expiresInSeconds: number): boolean {
  const now = Date.now() / 1000
  const secondsUntilExpiry = (tokenIssuedAt + expiresInSeconds) - now
  return secondsUntilExpiry < 300 // Less than 5 minutes
}

/**
 * Extract token from headers and check if refresh is needed
 * Returns { needsRefresh: boolean, token: string }
 */
export function checkTokenRefresh(
  authHeader?: string
): { needsRefresh: boolean; token?: string } {
  if (!authHeader) {
    return { needsRefresh: false }
  }

  // Extract Bearer token
  const match = authHeader.match(/Bearer\s+(.+)/)
  if (!match) {
    return { needsRefresh: false }
  }

  const token = match[1]

  // Decode JWT without verification (just to check expiry)
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return { needsRefresh: false, token }
    }

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    )

    // Check if exp claim exists and is close to expiry
    if (payload.exp) {
      const expiresInSeconds = payload.exp - Math.floor(Date.now() / 1000)
      if (expiresInSeconds < 300) { // Less than 5 minutes
        return { needsRefresh: true, token }
      }
    }

    // Check if iat + max_age indicates expiry soon
    if (payload.iat && payload.max_age) {
      const issuedAt = payload.iat
      if (isTokenExpiringSoon(issuedAt, payload.max_age)) {
        return { needsRefresh: true, token }
      }
    }

    return { needsRefresh: false, token }
  } catch (err) {
    console.warn('[token-refresh] Failed to decode token:', err)
    return { needsRefresh: false, token }
  }
}

/**
 * Middleware to check and potentially refresh token before mutations
 * In a real scenario, you'd call your auth provider's refresh endpoint here
 * 
 * Usage in API routes:
 *   const refreshed = await ensureTokenValid(request.headers.get('authorization'))
 */
export async function ensureTokenValid(
  authHeader?: string
): Promise<{ valid: boolean; newToken?: string }> {
  const { needsRefresh, token } = checkTokenRefresh(authHeader)

  if (!needsRefresh) {
    return { valid: true }
  }

  // In a real implementation, call your auth provider's refresh endpoint
  // For now, just log that refresh would be needed
  console.log('[token-refresh] Token expiring soon - refresh would be called here')
  console.log('[token-refresh] In production, call your OAuth provider refresh endpoint')

  // Example of what this would look like:
  // try {
  //   const refreshResponse = await fetch('https://your-auth-provider/refresh', {
  //     method: 'POST',
  //     headers: { 'Authorization': `Bearer ${token}` },
  //   })
  //   const { access_token } = await refreshResponse.json()
  //   return { valid: true, newToken: access_token }
  // } catch (err) {
  //   return { valid: false }
  // }

  return { valid: true } // For now, assume token is still valid
}
