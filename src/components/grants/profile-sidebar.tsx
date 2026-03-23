import Link from 'next/link'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Pencil } from 'lucide-react'

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || 'Necunoscut'}</span>
    </div>
  )
}

export function ProfileSidebar({
  profile,
}: {
  profile: Record<string, unknown>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profilul companiei</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FieldRow
            label="Denumire"
            value={profile.company_name as string | null}
          />
          <FieldRow
            label="Activitate"
            value={profile.industry as string | null}
          />
          <FieldRow
            label="Locatie"
            value={profile.location as string | null}
          />
          <FieldRow
            label="Forma juridica"
            value={profile.legal_form as string | null}
          />
        </div>

        {typeof profile.purchase_need === 'string' && profile.purchase_need && (
          <FieldRow
            label="Necesitate achizitie"
            value={profile.purchase_need}
          />
        )}

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <Pencil className="size-3.5" />
          Editeaza profilul
        </Link>
      </CardContent>
    </Card>
  )
}
