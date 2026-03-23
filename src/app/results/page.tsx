import { createClient } from '@/lib/supabase/server'
import { matchGrants } from '@/app/actions/matching'
import { generateShareLink } from '@/app/actions/share'
import { getSavedGrants } from '@/app/actions/saved-grants'
import Link from 'next/link'
import { ResultsLayout } from '@/components/grants/results-layout'
import { MatchList } from '@/components/grants/match-list'
import { Card, CardContent } from '@/components/ui/card'

export default async function ResultsPage() {
  // Check auth state
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  // Fetch saved grants if authenticated
  const savedGrantIds: string[] = isAuthenticated
    ? (await getSavedGrants()).grants
    : []

  const result = await matchGrants()

  if ('error' in result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (result.totalGrants === 0) {
    return (
      <ResultsLayout profile={result.profile} shareToken={null}>
        <div className="py-12 text-center">
          <p className="text-lg font-medium">
            Nu exista granturi active in acest moment
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Revino mai tarziu — adaugam granturi noi in mod regulat.
          </p>
          <Link
            href="/grants/browse"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Cauta in catalogul de granturi
          </Link>
        </div>
      </ResultsLayout>
    )
  }

  // Generate share token for the share button
  let shareToken: string | null = null
  try {
    const shareResult = await generateShareLink()
    shareToken = 'shareToken' in shareResult ? shareResult.shareToken : null
  } catch {
    // Non-critical — results still work without share link
  }

  return (
    <ResultsLayout profile={result.profile} shareToken={shareToken}>
      <p className="mb-6 text-sm text-muted-foreground">
        Am gasit {result.filteredCount} granturi potrivite din{' '}
        {result.totalGrants} disponibile
      </p>
      <MatchList
        scores={result.scores}
        grants={result.grants}
        isAuthenticated={isAuthenticated}
        savedGrantIds={savedGrantIds}
      />
    </ResultsLayout>
  )
}
