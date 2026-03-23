import { timingSafeEqual } from 'crypto'

/**
 * Validate CRON_SECRET from Authorization header using timing-safe comparison.
 * Prevents timing attacks on cron endpoint authentication.
 */
export function validateCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('CRON_SECRET environment variable is not configured')
    return false
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false

  const token = authHeader.replace('Bearer ', '')
  if (token.length !== secret.length) return false

  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(secret))
  } catch {
    return false
  }
}
