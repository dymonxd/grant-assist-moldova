import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { matchGrants } from '@/app/actions/matching'
import { generateShareLink } from '@/app/actions/share'
import { ResultsLayout } from '@/components/grants/results-layout'
import { MatchList } from '@/components/grants/match-list'
import { Card, CardContent } from '@/components/ui/card'

export default async function ResultsPage() {
  const session = await getSession()
  if (!session.companyProfileId) {
    redirect('/')
  }

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
        </div>
      </ResultsLayout>
    )
  }

  // Generate share token for the share button
  const shareResult = await generateShareLink()
  const shareToken =
    'shareToken' in shareResult ? shareResult.shareToken : null

  return (
    <ResultsLayout profile={result.profile} shareToken={shareToken}>
      <p className="mb-6 text-sm text-muted-foreground">
        Am gasit {result.filteredCount} granturi potrivite din{' '}
        {result.totalGrants} disponibile
      </p>
      <MatchList scores={result.scores} grants={result.grants} />
    </ResultsLayout>
  )
}
