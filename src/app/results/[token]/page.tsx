import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { preFilterGrants } from '@/lib/matching/pre-filter'
import { rankGrants } from '@/lib/matching/rank-grants'
import { ResultsLayout } from '@/components/grants/results-layout'
import { MatchList } from '@/components/grants/match-list'
import { Info } from 'lucide-react'
import type { GrantWithRules } from '@/lib/matching/types'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function SharedResultsPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Validate UUID format
  if (!UUID_REGEX.test(token)) {
    notFound()
  }

  const admin = createAdminClient()

  // Look up profile by share token (must be non-expired)
  const { data: profile } = await admin
    .from('company_profiles')
    .select('*')
    .eq('share_token', token)
    .gt('share_token_expires_at', new Date().toISOString())
    .single()

  if (!profile) {
    notFound()
  }

  // Fetch active non-expired grants
  const { data: grants } = await admin
    .from('grants')
    .select(
      'id, name, provider_agency, description, max_funding, currency, deadline, eligibility_rules, scoring_rubric'
    )
    .eq('status', 'active')
    .gte('deadline', new Date().toISOString())

  if (!grants || grants.length === 0) {
    return (
      <ResultsLayout profile={profile}>
        <SharedBanner />
        <p className="mt-6 text-center text-muted-foreground">
          Nu exista granturi active in acest moment
        </p>
      </ResultsLayout>
    )
  }

  // Run matching pipeline
  const candidates: GrantWithRules[] = preFilterGrants(grants, profile)
  const scores = await rankGrants(profile, candidates)

  return (
    <ResultsLayout profile={profile}>
      <SharedBanner />
      <p className="mb-6 text-sm text-muted-foreground">
        Am gasit {candidates.length} granturi potrivite din {grants.length}{' '}
        disponibile
      </p>
      <MatchList scores={scores} grants={candidates} />
    </ResultsLayout>
  )
}

function SharedBanner() {
  return (
    <div className="mb-6 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
      <Info className="size-4 shrink-0" />
      Aceasta pagina a fost partajata cu tine
    </div>
  )
}
