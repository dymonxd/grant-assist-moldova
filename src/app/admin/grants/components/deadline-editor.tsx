'use client'

import { useState, useTransition } from 'react'
import { updateDeadline } from '@/app/actions/admin-grants'

interface DeadlineEditorProps {
  grantId: string
  currentDeadline: string
  onUpdate: (newDeadline: string) => void
}

export function DeadlineEditor({
  grantId,
  currentDeadline,
  onUpdate,
}: DeadlineEditorProps) {
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  const formattedDate = new Intl.DateTimeFormat('ro-MD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(currentDeadline))

  function handleSave(newDate: string) {
    if (!newDate || newDate === currentDeadline.split('T')[0]) {
      setEditing(false)
      return
    }

    startTransition(async () => {
      const result = await updateDeadline(grantId, newDate)
      if ('success' in result) {
        onUpdate(newDate)
      }
      setEditing(false)
    })
  }

  if (editing) {
    return (
      <input
        type="date"
        defaultValue={currentDeadline.split('T')[0]}
        autoFocus
        disabled={isPending}
        className="rounded border border-input bg-background px-2 py-1 text-sm"
        onBlur={(e) => handleSave(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSave((e.target as HTMLInputElement).value)
          }
          if (e.key === 'Escape') {
            setEditing(false)
          }
        }}
      />
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      disabled={isPending}
      className="cursor-pointer rounded px-1 py-0.5 text-left text-sm hover:bg-muted/80"
      title="Click pentru a edita"
    >
      {isPending ? (
        <span className="text-muted-foreground">Se salveaza...</span>
      ) : (
        formattedDate
      )}
    </button>
  )
}
