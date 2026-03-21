'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertTriangle } from 'lucide-react'

/**
 * Grant summary header with deadline countdown.
 *
 * Displays grant name, provider badge, funding amount (formatted ro-MD),
 * and deadline countdown. Shows urgent warning when < 3 days remain.
 *
 * Requirement: WRITE-11
 */

interface GrantHeaderProps {
  grant: {
    name: string
    provider_agency: string
    deadline: string | null
    max_funding: number | null
    currency: string
  }
  isUrgent: boolean
}

function formatFunding(amount: number | null, currency: string): string {
  if (amount === null) return 'Suma necunoscuta'
  const formatted = new Intl.NumberFormat('ro-MD').format(amount)
  return `${formatted} ${currency}`
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return 'Fara termen limita'
  return new Intl.DateTimeFormat('ro-MD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(deadline))
}

function getDaysLeft(deadline: string | null): number {
  if (!deadline) return Infinity
  const now = new Date()
  const deadlineDate = new Date(deadline)
  return Math.ceil(
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
}

export function GrantHeader({ grant, isUrgent }: GrantHeaderProps) {
  const daysLeft = getDaysLeft(grant.deadline)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle className="text-xl font-semibold">
            {grant.name}
          </CardTitle>
          <Badge variant="secondary">{grant.provider_agency}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">
            {formatFunding(grant.max_funding, grant.currency)}
          </p>

          {grant.deadline && (
            <div className="flex items-center gap-1.5 text-sm">
              {isUrgent ? (
                <>
                  <AlertTriangle className="size-4 text-amber-500" />
                  <span className="font-medium text-amber-600">
                    Atentie: {daysLeft <= 0 ? '0' : daysLeft} zile ramase!
                  </span>
                </>
              ) : (
                <>
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {daysLeft} zile ramase ({formatDeadline(grant.deadline)})
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
