import { Search } from 'lucide-react'
import { GrantCard } from './grant-card'
import type { Grant } from './grant-card'

interface GrantListProps {
  grants: Grant[]
}

export function GrantList({ grants }: GrantListProps) {
  if (grants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Search className="mb-4 size-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold">Nu am gasit granturi</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Incearca sa modifici filtrele sau sa cauti altceva
        </p>
      </div>
    )
  }

  const countLabel =
    grants.length === 1
      ? '1 grant disponibil'
      : `${grants.length} granturi disponibile`

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">{countLabel}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {grants.map((grant) => (
          <GrantCard key={grant.id} grant={grant} />
        ))}
      </div>
    </div>
  )
}
