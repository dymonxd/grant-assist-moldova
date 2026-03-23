'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { resolveCompanyProfileId } from '@/lib/auth/resolve-profile'

/**
 * Generates a shareable link for the current company profile results.
 *
 * Idempotent: returns existing token if still valid (non-expired),
 * only generates a new one when needed. Token expires after 30 days.
 * (MATCH-07, MATCH-08)
 */
export async function generateShareLink(): Promise<
  { shareToken: string } | { error: string }
> {
  const companyProfileId = await resolveCompanyProfileId()
  if (!companyProfileId) {
    return { error: 'Profilul companiei nu a fost creat inca' }
  }

  const admin = createAdminClient()

  // Idempotency check: look for existing valid token
  const { data: existing } = await admin
    .from('company_profiles')
    .select('share_token, share_token_expires_at')
    .eq('id', companyProfileId)
    .single()

  if (
    existing?.share_token &&
    existing.share_token_expires_at &&
    existing.share_token_expires_at > new Date().toISOString()
  ) {
    return { shareToken: existing.share_token }
  }

  // Generate new token with 30-day expiry
  const share_token = crypto.randomUUID()
  const share_token_expires_at = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString()

  const { data, error } = await admin
    .from('company_profiles')
    .update({ share_token, share_token_expires_at })
    .eq('id', companyProfileId)
    .select('share_token')
    .single()

  if (error || !data) {
    return { error: 'Nu am putut genera linkul de partajare' }
  }

  return { shareToken: data.share_token }
}
