'use client'

import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SignupForm } from './signup-form'

export function AccountWallModal({
  open,
  onOpenChange,
  grantId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  grantId: string
}) {
  const grantUrl = `/grants/${grantId}/write`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Creaza un cont pentru a aplica</DialogTitle>
          <DialogDescription>
            Contul tau va salva progresul si vei primi notificari despre termene.
          </DialogDescription>
        </DialogHeader>

        <SignupForm redirectTo={grantUrl} />

        <div className="border-t my-4" />

        <div className="text-center">
          <Link
            href={grantUrl}
            onClick={() => onOpenChange(false)}
            className="text-sm text-muted-foreground underline"
          >
            Continua fara cont
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
