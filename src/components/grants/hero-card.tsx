'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScoreBadge } from './score-badge'
import { SaveButton } from './save-button'
import { AccountWallModal } from '@/components/auth/account-wall-modal'
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

export function HeroCard({
  grant,
  score,
  isAuthenticated,
  isSaved,
}: {
  grant: GrantWithRules
  score: GrantScore
  isAuthenticated: boolean
  isSaved: boolean
}) {
  const [showModal, setShowModal] = useState(false)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-xl">{grant.name}</CardTitle>
            <Badge variant="secondary">{grant.provider_agency}</Badge>
          </div>
          <ScoreBadge score={score.score} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-muted-foreground">{score.explanation}</p>

        <div className="space-y-1 text-sm">
          <p className="font-medium">
            {formatFunding(grant.max_funding, grant.currency)}
          </p>
          <p className="text-muted-foreground">
            Termen: {formatDeadline(grant.deadline)}
          </p>
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        {isAuthenticated ? (
          <Link
            href={`/grants/${grant.id}/write`}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Aplica acum
          </Link>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Aplica acum
          </button>
        )}
        <SaveButton
          grantId={grant.id}
          initialSaved={isSaved}
          isAuthenticated={isAuthenticated}
          onAuthRequired={() => setShowModal(true)}
        />
        <AccountWallModal
          open={showModal}
          onOpenChange={setShowModal}
          grantId={grant.id}
        />
      </CardFooter>
    </Card>
  )
}
