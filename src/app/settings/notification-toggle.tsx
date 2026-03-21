'use client'

import { useState, useTransition } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { updateNotificationPreferences } from '@/app/actions/settings'

interface NotificationToggleProps {
  initialValue: boolean
}

export function NotificationToggle({ initialValue }: NotificationToggleProps) {
  const [checked, setChecked] = useState(initialValue)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleChange(newChecked: boolean) {
    setChecked(newChecked)
    setMessage(null)

    startTransition(async () => {
      const result = await updateNotificationPreferences(newChecked)

      if ('error' in result) {
        // Revert on error
        setChecked(!newChecked)
        setMessage(result.error)
        return
      }

      setMessage('Preferintele au fost salvate')
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Checkbox
          id="email-notifications"
          checked={checked}
          onCheckedChange={handleChange}
          disabled={isPending}
        />
        <Label htmlFor="email-notifications" className="cursor-pointer">
          Primeste notificari prin email
        </Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Notificari despre termene limita, granturi noi si actualizari importante.
      </p>
      {message && (
        <p
          className={`text-sm ${
            message.includes('salvate')
              ? 'text-green-600 dark:text-green-400'
              : 'text-destructive'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
