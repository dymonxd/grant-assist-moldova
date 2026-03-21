'use client'

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PartialBadge } from './partial-badge'
import { Pencil } from 'lucide-react'

interface ProfileData {
  company_name?: string | null
  industry?: string | null
  location?: string | null
  legal_form?: string | null
  enriched_data?: {
    merged?: {
      status?: string | null
      registration_date?: string | null
      activities?: string[]
      directors?: string[]
      founders?: string[]
    }
  } & Record<string, unknown>
  [key: string]: unknown
}

interface ProfileResultProps {
  profile: ProfileData
  isPartial?: boolean
  sourceStatus?: Record<string, 'success' | 'error' | 'timeout'>
  allFailed?: boolean
  onManualEntry: () => void
  onContinue: () => void
}

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">
        {value || 'Necunoscut'}
      </span>
    </div>
  )
}

function ListField({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="flex flex-col gap-1 col-span-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <ul className="text-sm space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="font-medium">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ProfileResult({
  profile,
  isPartial,
  sourceStatus,
  allFailed,
  onManualEntry,
  onContinue,
}: ProfileResultProps) {
  if (allFailed) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <p className="text-muted-foreground">
            Nu am gasit date pentru acest IDNO
          </p>
          <Button
            onClick={onManualEntry}
            variant="outline"
            className="h-11"
          >
            Completeaza manual
          </Button>
        </CardContent>
      </Card>
    )
  }

  const enriched = profile.enriched_data?.merged

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>Datele companiei</CardTitle>
          <Button variant="ghost" size="sm" disabled>
            <Pencil className="size-3.5" />
            Editeaza
          </Button>
        </div>
        {isPartial && sourceStatus && (
          <PartialBadge sourceStatus={sourceStatus} />
        )}
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <FieldRow label="Denumire" value={profile.company_name} />
          <FieldRow label="Forma juridica" value={profile.legal_form} />
          <FieldRow label="Locatie" value={profile.location} />
          <FieldRow label="Statut" value={enriched?.status} />
          <FieldRow label="Data inregistrarii" value={enriched?.registration_date} />
          <FieldRow label="Activitate principala" value={profile.industry} />

          <ListField label="Genuri de activitate" items={enriched?.activities?.slice(0, 3)} />
          <ListField label="Conducatori" items={enriched?.directors} />
          <ListField label="Fondatori" items={enriched?.founders} />
        </div>
      </CardContent>

      <div className="px-4 pb-4">
        <Button onClick={onContinue} className="w-full h-11">
          Continua
        </Button>
      </div>
    </Card>
  )
}
