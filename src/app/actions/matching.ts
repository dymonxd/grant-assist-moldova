'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/session'
import { preFilterGrants } from '@/lib/matching/pre-filter'
import { rankGrants } from '@/lib/matching/rank-grants'
import type { MatchResult } from '@/lib/matching/types'

/**
 * Two-stage grant matching server action.
 *
 * 1. Validates session ownership (MATCH-08)
 * 2. Fetches company profile and active grants
 * 3. Pre-filters grants by eligibility rules (MATCH-01)
 * 4. AI-ranks candidates with structured output (MATCH-02, MATCH-04)
 * 5. Returns MatchResult with grants array for UI rendering
 */
export async function matchGrants(): Promise<
  MatchResult | { error: string }
> {
  const session = await getSession()
  if (!session.companyProfileId) {
    return { error: 'Profilul companiei nu a fost creat inca' }
  }

  const admin = createAdminClient()

  // 1. Fetch company profile (MATCH-08: ownership validation via session)
  const { data: profile, error: profileErr } = await admin
    .from('company_profiles')
    .select('*')
    .eq('id', session.companyProfileId)
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
    return { error: 'Nu exista granturi active in acest moment' }
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
