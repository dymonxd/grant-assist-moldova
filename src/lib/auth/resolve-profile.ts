import { getSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Resolve the current user's company profile ID.
 * Checks session first (anonymous flow), then falls back to
 * authenticated user's claimed profile (post-signup flow).
 */
export async function resolveCompanyProfileId(): Promise<string | null> {
  const session = await getSession()
  if (session.companyProfileId) {
    return session.companyProfileId
  }

  // Fallback: check authenticated user's claimed profile
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: ownedProfile } = await admin
    .from('company_profiles')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return ownedProfile?.id ?? null
}
