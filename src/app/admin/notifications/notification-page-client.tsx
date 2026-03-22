'use client'

import { useState, useTransition } from 'react'
import {
  getNotificationLog,
  type NotificationLogItem,
} from '@/app/actions/admin-notifications'
import { NotificationTable } from './components/notification-table'
import { BulkSendDialog } from './components/bulk-send-dialog'

const FILTERS = [
  { value: '', label: 'Toate' },
  { value: 'deadline_reminder', label: 'Memento termen' },
  { value: 'abandoned_draft', label: 'Ciorna abandonata' },
  { value: 'grant_expiring', label: 'Grant expira' },
  { value: 'new_grant_match', label: 'Grant nou potrivit' },
]

export function NotificationPageClient({
  initialNotifications,
}: {
  initialNotifications: NotificationLogItem[]
}) {
  const [notifications, setNotifications] =
    useState<NotificationLogItem[]>(initialNotifications)
  const [activeFilter, setActiveFilter] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleFilterChange(filterValue: string) {
    setActiveFilter(filterValue)
    startTransition(async () => {
      const result = await getNotificationLog(filterValue || undefined)
      if (!('error' in result)) {
        setNotifications(result.data!)
      }
    })
  }

  function handleBulkSendComplete() {
    // Refresh the log after bulk send
    startTransition(async () => {
      const result = await getNotificationLog(activeFilter || undefined)
      if (!('error' in result)) {
        setNotifications(result.data!)
      }
    })
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Jurnal notificari
        </h1>
        <BulkSendDialog onComplete={handleBulkSendComplete} />
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => handleFilterChange(filter.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === filter.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Loading indicator */}
      {isPending && (
        <div className="mb-4 text-sm text-muted-foreground">
          Se incarca...
        </div>
      )}

      {/* Notification table */}
      <div className="rounded-lg border border-border">
        <NotificationTable notifications={notifications} />
      </div>
    </main>
  )
}
