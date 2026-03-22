'use client'

import { useState } from 'react'
import type { ApplicationListItem } from '@/app/actions/admin-analytics'

interface ApplicationsTableProps {
  applications: ApplicationListItem[]
  onSendReminder: (id: string) => Promise<{ error?: string }>
}

const dateFormatter = new Intl.DateTimeFormat('ro-MD', {
  dateStyle: 'medium',
})

export function ApplicationsTable({
  applications,
  onSendReminder,
}: ApplicationsTableProps) {
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    id: string
    message: string
    type: 'success' | 'error'
  } | null>(null)

  async function handleReminder(appId: string) {
    setSendingId(appId)
    setFeedback(null)
    try {
      const result = await onSendReminder(appId)
      if (result.error) {
        setFeedback({ id: appId, message: result.error, type: 'error' })
      } else {
        setFeedback({
          id: appId,
          message: 'Memento trimis cu succes',
          type: 'success',
        })
      }
    } catch {
      setFeedback({
        id: appId,
        message: 'Eroare neasteptata',
        type: 'error',
      })
    } finally {
      setSendingId(null)
    }
  }

  if (applications.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Nicio aplicatie activa
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 font-medium text-muted-foreground">
              Utilizator
            </th>
            <th className="text-left py-2 px-3 font-medium text-muted-foreground">
              Grant
            </th>
            <th className="text-left py-2 px-3 font-medium text-muted-foreground hidden sm:table-cell">
              Ultima activitate
            </th>
            <th className="text-left py-2 px-3 font-medium text-muted-foreground">
              Progres
            </th>
            <th className="text-left py-2 px-3 font-medium text-muted-foreground">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr
              key={app.id}
              className={`border-b border-border transition-colors ${
                app.isStale ? 'bg-orange-50' : 'hover:bg-accent/30'
              }`}
            >
              <td className="py-2 px-3">
                <div className="font-medium">{app.userName}</div>
                <div className="text-xs text-muted-foreground">
                  {app.userEmail}
                </div>
              </td>
              <td className="py-2 px-3">
                <div>{app.grantName}</div>
                {app.grantDeadline && (
                  <div className="text-xs text-muted-foreground">
                    Termen:{' '}
                    {dateFormatter.format(new Date(app.grantDeadline))}
                  </div>
                )}
              </td>
              <td className="py-2 px-3 hidden sm:table-cell text-muted-foreground">
                {dateFormatter.format(new Date(app.updated_at))}
              </td>
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${app.completionPercent}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums">
                    {app.completionPercent}%
                  </span>
                </div>
              </td>
              <td className="py-2 px-3">
                {app.isStale ? (
                  <div className="space-y-1">
                    <span className="inline-block rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-xs font-semibold">
                      Inactiv
                    </span>
                    <button
                      type="button"
                      onClick={() => handleReminder(app.id)}
                      disabled={sendingId === app.id}
                      className="block text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {sendingId === app.id
                        ? 'Se trimite...'
                        : 'Trimite memento'}
                    </button>
                    {feedback?.id === app.id && (
                      <span
                        className={`block text-xs ${
                          feedback.type === 'success'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {feedback.message}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="inline-block rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-semibold">
                    Activ
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
