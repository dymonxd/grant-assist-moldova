import Link from 'next/link'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScoreBadge } from './score-badge'
import { ImprovementTips } from './improvement-tips'
import type { GrantWithRules, GrantScore } from '@/lib/matching/types'

function formatFunding(amount: number | null, currency: string): string {
  if (amount === null) return 'Suma necunoscuta'
  const formatted = new Intl.NumberFormat('ro-MD').format(amount)
  return `${formatted} ${currency}`
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return 'Fara termen limita'
  const date = new Date(deadline)
  return new Intl.DateTimeFormat('ro-MD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function MatchCard({
  grant,
  score,
}: {
  grant: GrantWithRules
  score: GrantScore
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{grant.name}</CardTitle>
          <ScoreBadge score={score.score} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{grant.provider_agency}</Badge>
          <span>{formatFunding(grant.max_funding, grant.currency)}</span>
          <span>Termen: {formatDeadline(grant.deadline)}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {score.explanation}
        </p>

        {score.score < 50 && score.improvement_suggestions && (
          <ImprovementTips suggestions={score.improvement_suggestions} />
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <Link
          href={`/grants/${grant.id}`}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Aplica acum
        </Link>
        <Button
          variant="outline"
          disabled
          title="Disponibil dupa autentificare"
        >
          Salveaza
        </Button>
      </CardFooter>
    </Card>
  )
}
