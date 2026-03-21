import Link from 'next/link'
import { HeroCard } from './hero-card'
import { MatchCard } from './match-card'
import type { GrantWithRules, GrantScore } from '@/lib/matching/types'

export function MatchList({
  scores,
  grants,
}: {
  scores: GrantScore[]
  grants: GrantWithRules[]
}) {
  if (scores.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          Nu am gasit granturi potrivite pentru profilul tau.
        </p>
        <Link
          href="/grants/browse"
          className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Exploreaza toate granturile
        </Link>
      </div>
    )
  }

  const grantMap = new Map(grants.map((g) => [g.id, g]))

  const topScore = scores[0]
  const topGrant = grantMap.get(topScore.grant_id)
  const remaining = scores.slice(1)

  return (
    <div className="space-y-4">
      {topGrant && <HeroCard grant={topGrant} score={topScore} />}

      {remaining.map((s) => {
        const grant = grantMap.get(s.grant_id)
        if (!grant) return null
        return <MatchCard key={s.grant_id} grant={grant} score={s} />
      })}
    </div>
  )
}
