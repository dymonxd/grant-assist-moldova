'use client'

import { useState } from 'react'
import { Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toggleSavedGrant } from '@/app/actions/saved-grants'

export function SaveButton({
  grantId,
  initialSaved,
  isAuthenticated,
  onAuthRequired,
}: {
  grantId: string
  initialSaved: boolean
  isAuthenticated: boolean
  onAuthRequired: () => void
}) {
  const [saved, setSaved] = useState(initialSaved)
  const [pending, setPending] = useState(false)

  if (!isAuthenticated) {
    return (
      <Button variant="outline" onClick={onAuthRequired}>
        <Bookmark className="size-4" />
        Salveaza
      </Button>
    )
  }

  async function handleToggle() {
    setPending(true)
    try {
      const result = await toggleSavedGrant(grantId)
      if ('saved' in result && typeof result.saved === 'boolean') {
        setSaved(result.saved)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleToggle} disabled={pending}>
      <Bookmark className={saved ? 'size-4 fill-current' : 'size-4'} />
      {saved ? 'Salvat' : 'Salveaza'}
    </Button>
  )
}
