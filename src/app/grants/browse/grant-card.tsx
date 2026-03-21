import Link from 'next/link'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface Grant {
  id: string
  name: string
  provider_agency: string
  description: string | null
  max_funding: number | null
  currency: string
  deadline: string | null
}

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

function isExpiringSoon(deadline: string | null): boolean {
  if (!deadline) return false
  const deadlineDate = new Date(deadline)
  const now = new Date()
  const diffMs = deadlineDate.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= 14
}

export function GrantCard({ grant }: { grant: Grant }) {
  const expiringSoon = isExpiringSoon(grant.deadline)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold">
            {grant.name}
          </CardTitle>
          <Badge variant="secondary">{grant.provider_agency}</Badge>
        </div>
        {expiringSoon && (
          <Badge variant="destructive" className="w-fit">
            Expira curand
          </Badge>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <p className="line-clamp-2 text-muted-foreground">
          {grant.description ?? 'Fara descriere'}
        </p>

        <div className="mt-auto space-y-1 text-sm">
          <p className="font-medium">
            {formatFunding(grant.max_funding, grant.currency)}
          </p>
          <p className="text-muted-foreground">
            Termen: {formatDeadline(grant.deadline)}
          </p>
        </div>
      </CardContent>

      <CardFooter>
        <Link
          href={`/grants/${grant.id}`}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Aplica
        </Link>
      </CardFooter>
    </Card>
  )
}
