'use client'

import type { NotificationLogItem } from '@/app/actions/admin-notifications'

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  deadline_reminder: {
    label: 'Memento termen',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
  },
  abandoned_draft: {
    label: 'Ciorna abandonata',
    color: 'text-orange-700',
    bg: 'bg-orange-100',
  },
  grant_expiring: {
    label: 'Grant expira',
    color: 'text-red-700',
    bg: 'bg-red-100',
  },
  new_grant_match: {
    label: 'Grant nou potrivit',
    color: 'text-green-700',
    bg: 'bg-green-100',
  },
}

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  sms: 'SMS',
}

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('ro-MD', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

export function NotificationTable({
  notifications,
}: {
  notifications: NotificationLogItem[]
}) {
  if (notifications.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-muted-foreground">
          Nu exista notificari trimise.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Utilizator
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Grant
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Tip
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Canal
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Trimis la
            </th>
          </tr>
        </thead>
        <tbody>
          {notifications.map((notif) => {
            const typeConfig = TYPE_CONFIG[notif.type] ?? {
              label: notif.type,
              color: 'text-gray-700',
              bg: 'bg-gray-100',
            }

            return (
              <tr
                key={notif.id}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {notif.profiles?.name ?? 'Necunoscut'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {notif.profiles?.email ?? ''}
                  </div>
                </td>
                <td className="px-4 py-3 text-foreground">
                  {notif.grants?.name ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${typeConfig.bg} ${typeConfig.color}`}
                  >
                    {typeConfig.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-foreground">
                  {CHANNEL_LABELS[notif.channel] ?? notif.channel}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(notif.sent_at)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
