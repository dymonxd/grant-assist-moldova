'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { preFilterGrants } from '@/lib/matching/pre-filter'
import { rankGrants } from '@/lib/matching/rank-grants'
import type { MatchResult } from '@/lib/matching/types'

/**
 * Two-stage grant matching server action.
 *
 * 1. Resolves company profile: session (anonymous) OR authenticated user's claimed profile
 * 2. Fetches company profile and active grants
 * 3. Pre-filters grants by eligibility rules (MATCH-01)
 * 4. AI-ranks candidates with structured output (MATCH-02, MATCH-04)
 * 5. Returns MatchResult with grants array for UI rendering
 */
export async function matchGrants(): Promise<
  MatchResult | { error: string }
> {
  const admin = createAdminClient()

  // Resolve company profile ID: session (anonymous) or authenticated user
  const session = await getSession()
  let companyProfileId = session.companyProfileId

  if (!companyProfileId) {
    // Check if authenticated user has a claimed company profile
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: ownedProfile } = await admin
        .from('company_profiles')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (ownedProfile) {
        companyProfileId = ownedProfile.id
      }
    }
  }

  if (!companyProfileId) {
    return { error: 'Profilul companiei nu a fost creat inca' }
  }

  // 1. Fetch company profile
  const { data: profile, error: profileErr } = await admin
    .from('company_profiles')
    .select('*')
    .eq('id', companyProfileId)
    .single()

  if (profileErr || !profile) {
    return { error: 'Profilul companiei nu a fost gasit' }
  }

  // 2. Fetch active grants with eligibility rules (Pitfall 5: filter by deadline)
  const { data: grants } = await admin
    .from('grants')
    .select(
      'id, name, provider_agency, description, max_funding, currency, deadline, eligibility_rules, scoring_rubric'
    )
    .eq('status', 'active')
    .gte('deadline', new Date().toISOString())

  if (!grants || grants.length === 0) {
    return {
      profile,
      scores: [],
      grants: [],
      totalGrants: 0,
      filteredCount: 0,
    }
  }

  // 3. Pre-filter by eligibility rules (MATCH-01)
  const candidates = preFilterGrants(grants, profile)

  // 4. AI ranking (MATCH-02, MATCH-04)
  const scores = await rankGrants(profile, candidates)

  // 5. Return full result with grants array for UI rendering
  return {
    profile,
    scores,
    grants: candidates,
    totalGrants: grants.length,
    filteredCount: candidates.length,
  }
}
